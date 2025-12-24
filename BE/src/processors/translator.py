"""브리핑 번역 모듈

한국어 브리핑을 영어로 번역합니다.
배치 번역으로 API 호출을 최소화합니다.
"""
import json
from pathlib import Path
from .gemini_client import GeminiClient
from ..utils.logger import get_logger

logger = get_logger(__name__)


class BriefingTranslator:
    """브리핑 번역기 (배치 번역 최적화)"""

    BATCH_SIZE = 10  # 한 번에 번역할 기사 수

    def __init__(self, gemini_client: GeminiClient):
        self.gemini = gemini_client

    async def translate_briefing_content(self, briefing: dict) -> dict:
        """브리핑 섹션 전체를 한 번에 번역 (1회 API 호출)"""

        # 번역할 텍스트 수집
        texts_to_translate = {
            "opening": briefing.get("opening", ""),
            "closing": briefing.get("closing", ""),
        }

        # sections 추가
        for i, section in enumerate(briefing.get("sections", [])):
            texts_to_translate[f"section_{i}_title"] = section.get("title", "")
            texts_to_translate[f"section_{i}_content"] = section.get("content", "")

        prompt = f"""Translate the following Korean texts to English.
Keep the tone professional and suitable for a climate news briefing.
Preserve any numbers, references like [1], [2], etc., and emoji if present.

Return the translations in the same JSON format with the same keys.

Korean texts:
{json.dumps(texts_to_translate, ensure_ascii=False, indent=2)}

Return only valid JSON, nothing else."""

        try:
            result = await self.gemini.generate(prompt, max_output_tokens=16000)
            if not result:
                return briefing

            # JSON 파싱
            translated = self._parse_json(result)
            if not translated:
                logger.warning("브리핑 번역 JSON 파싱 실패, 원본 유지")
                return briefing

            # 번역 결과 적용
            briefing["opening"] = translated.get("opening", briefing.get("opening", ""))
            briefing["closing"] = translated.get("closing", briefing.get("closing", ""))

            for i, section in enumerate(briefing.get("sections", [])):
                section["title"] = translated.get(f"section_{i}_title", section.get("title", ""))
                section["content"] = translated.get(f"section_{i}_content", section.get("content", ""))

            logger.info("브리핑 섹션 번역 완료 (1회 API 호출)")
            return briefing

        except Exception as e:
            logger.error(f"브리핑 번역 실패: {e}")
            return briefing

    async def translate_articles_batch(self, articles: list) -> list:
        """기사들을 배치로 번역 (10개씩 묶어서 API 호출)"""

        total_batches = (len(articles) + self.BATCH_SIZE - 1) // self.BATCH_SIZE

        for batch_idx in range(total_batches):
            start_idx = batch_idx * self.BATCH_SIZE
            end_idx = min(start_idx + self.BATCH_SIZE, len(articles))
            batch = articles[start_idx:end_idx]

            logger.info(f"기사 배치 {batch_idx + 1}/{total_batches} 번역 중 ({start_idx + 1}-{end_idx})")

            # 번역할 데이터 수집
            batch_data = {}
            for i, article in enumerate(batch):
                article_idx = start_idx + i

                # title 번역 (한국어인 경우만)
                if article.get("title") and article.get("language") == "ko":
                    batch_data[f"article_{article_idx}_title"] = article["title"]

                # description 번역 (RSS 원본 요약)
                if article.get("description"):
                    batch_data[f"article_{article_idx}_description"] = article["description"]

                # summary 번역
                if article.get("summary") and isinstance(article["summary"], dict):
                    for key in ["phenomenon", "cause", "outlook"]:
                        value = article["summary"].get(key, "")
                        if value and value != "기사에서 언급되지 않음":
                            batch_data[f"article_{article_idx}_{key}"] = value

                # keywords 번역
                if article.get("keywords"):
                    batch_data[f"article_{article_idx}_keywords"] = article["keywords"]

            if not batch_data:
                continue

            prompt = f"""Translate the following Korean texts to English.
Keep the tone professional and suitable for a climate news briefing.
For keywords arrays, translate each keyword individually.

Return the translations in the same JSON format with the same keys.

Korean texts:
{json.dumps(batch_data, ensure_ascii=False, indent=2)}

Return only valid JSON, nothing else."""

            try:
                result = await self.gemini.generate(prompt, max_output_tokens=16000)
                if not result:
                    continue

                translated = self._parse_json(result)
                if not translated:
                    logger.warning(f"배치 {batch_idx + 1} JSON 파싱 실패")
                    continue

                # 번역 결과 적용
                for i, article in enumerate(batch):
                    article_idx = start_idx + i

                    # title 적용
                    title_key = f"article_{article_idx}_title"
                    if title_key in translated:
                        article["original_title"] = article["title"]  # 원본 저장
                        article["title"] = translated[title_key]

                    # description 적용
                    desc_key = f"article_{article_idx}_description"
                    if desc_key in translated:
                        article["original_description"] = article.get("description", "")
                        article["description"] = translated[desc_key]

                    # summary 적용
                    if article.get("summary") and isinstance(article["summary"], dict):
                        for key in ["phenomenon", "cause", "outlook"]:
                            trans_key = f"article_{article_idx}_{key}"
                            if trans_key in translated:
                                article["summary"][key] = translated[trans_key]
                            elif article["summary"].get(key) == "기사에서 언급되지 않음":
                                article["summary"][key] = "Not mentioned in the article"

                    # keywords 적용
                    kw_key = f"article_{article_idx}_keywords"
                    if kw_key in translated:
                        article["keywords"] = translated[kw_key]

            except Exception as e:
                logger.error(f"배치 {batch_idx + 1} 번역 실패: {e}")
                continue

        return articles

    async def translate_summary_keywords(self, summary: dict) -> dict:
        """summary.top_keywords 번역"""
        if not summary.get("top_keywords"):
            return summary

        prompt = f"""Translate the following Korean keywords to English.
Keep them concise (1-3 words each).

Korean keywords:
{json.dumps(summary["top_keywords"], ensure_ascii=False)}

Return only a JSON array of translated keywords, nothing else."""

        try:
            result = await self.gemini.generate(prompt, max_output_tokens=1000)
            if not result:
                return summary

            # JSON 배열 파싱
            import re
            match = re.search(r'\[[\s\S]*\]', result)
            if match:
                translated_keywords = json.loads(match.group(0))
                summary["original_top_keywords"] = summary["top_keywords"]
                summary["top_keywords"] = translated_keywords
                logger.info("top_keywords 번역 완료")

        except Exception as e:
            logger.error(f"top_keywords 번역 실패: {e}")

        return summary

    async def translate_briefing(self, briefing_data: dict) -> dict:
        """브리핑 전체를 영어로 번역 (배치 최적화)"""
        translated = briefing_data.copy()

        # 1. 브리핑 섹션 번역 (1회 API 호출)
        if "briefing" in translated:
            logger.info("브리핑 섹션 번역 시작...")
            translated["briefing"] = await self.translate_briefing_content(translated["briefing"])

        # 2. 기사들 배치 번역 (10개씩)
        if "articles" in translated:
            logger.info(f"기사 {len(translated['articles'])}개 번역 시작...")
            translated["articles"] = await self.translate_articles_batch(translated["articles"])

        # 3. summary.top_keywords 번역
        if "summary" in translated:
            logger.info("summary 키워드 번역 시작...")
            translated["summary"] = await self.translate_summary_keywords(translated["summary"])

        translated["language"] = "en"
        return translated

    def _parse_json(self, text: str) -> dict | None:
        """JSON 응답 파싱"""
        if not text:
            return None

        try:
            # ```json ... ``` 형식 처리
            if "```json" in text:
                start_idx = text.find("```json") + 7
                end_idx = text.find("```", start_idx)
                if end_idx > start_idx:
                    text = text[start_idx:end_idx]
                else:
                    text = text[start_idx:]
            elif "```" in text:
                import re
                match = re.search(r"```\s*([\s\S]*?)(?:```|$)", text)
                if match:
                    text = match.group(1)

            # JSON 부분 추출
            import re
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                text = match.group(0)

            return json.loads(text)

        except json.JSONDecodeError as e:
            logger.debug(f"JSON 파싱 실패: {e}")
            return None


async def translate_briefing_file(
    input_path: Path,
    output_path: Path,
    gemini_client: GeminiClient
) -> bool:
    """브리핑 파일을 번역하여 저장"""
    try:
        # 원본 파일 읽기
        with open(input_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # 번역
        translator = BriefingTranslator(gemini_client)
        translated = await translator.translate_briefing(data)

        # 저장
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(translated, f, ensure_ascii=False, indent=2)

        logger.info(f"번역 완료: {output_path}")
        return True

    except Exception as e:
        logger.error(f"파일 번역 실패 [{input_path}]: {e}")
        return False
