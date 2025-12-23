"""브리핑 번역 모듈

한국어 브리핑을 영어로 번역합니다.
"""
import json
from pathlib import Path
from .gemini_client import GeminiClient
from ..utils.logger import get_logger

logger = get_logger(__name__)


class BriefingTranslator:
    """브리핑 번역기"""

    def __init__(self, gemini_client: GeminiClient):
        self.gemini = gemini_client

    async def translate_text(self, text: str) -> str:
        """텍스트를 영어로 번역"""
        if not text:
            return text

        prompt = f"""Translate the following Korean text to English.
Keep the tone professional and suitable for a climate news briefing.
Preserve any numbers, references like [1], [2], etc., and emoji if present.
Only return the translated text, nothing else.

Korean text:
{text}"""

        try:
            result = await self.gemini.generate(prompt)
            return result.strip() if result else text
        except Exception as e:
            logger.error(f"번역 실패: {e}")
            return text

    async def translate_briefing(self, briefing_data: dict) -> dict:
        """브리핑 전체를 영어로 번역"""
        translated = briefing_data.copy()

        # briefing 섹션 번역
        if "briefing" in translated:
            briefing = translated["briefing"]

            # opening 번역
            if briefing.get("opening"):
                logger.info("Opening 번역 중...")
                briefing["opening"] = await self.translate_text(briefing["opening"])

            # sections 번역
            if briefing.get("sections"):
                for i, section in enumerate(briefing["sections"]):
                    logger.info(f"Section {i+1} 번역 중...")
                    if section.get("title"):
                        section["title"] = await self.translate_text(section["title"])
                    if section.get("content"):
                        section["content"] = await self.translate_text(section["content"])

            # closing 번역
            if briefing.get("closing"):
                logger.info("Closing 번역 중...")
                briefing["closing"] = await self.translate_text(briefing["closing"])

        # articles 섹션의 summary 번역
        if "articles" in translated:
            for i, article in enumerate(translated["articles"]):
                if i % 10 == 0:
                    logger.info(f"Article {i+1}/{len(translated['articles'])} 번역 중...")

                # summary 번역
                if article.get("summary") and isinstance(article["summary"], dict):
                    for key in ["phenomenon", "cause", "outlook"]:
                        if article["summary"].get(key) and article["summary"][key] != "기사에서 언급되지 않음":
                            article["summary"][key] = await self.translate_text(article["summary"][key])
                        elif article["summary"].get(key) == "기사에서 언급되지 않음":
                            article["summary"][key] = "Not mentioned in the article"

                # keywords 번역 (선택적)
                if article.get("keywords"):
                    translated_keywords = []
                    for keyword in article["keywords"]:
                        translated_kw = await self.translate_text(keyword)
                        translated_keywords.append(translated_kw)
                    article["keywords"] = translated_keywords

        translated["language"] = "en"
        return translated


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
