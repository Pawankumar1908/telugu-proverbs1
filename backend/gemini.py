import google.genai as genai
from config import GEMINI_API_KEY, GEMINI_MODEL, OPENAI_API_KEY
import openai

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
openai_client = openai.OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


def explain_with_gemini(query, proverb):
    proverb_text = proverb.get('proverb', '')[:50] if proverb else ""
    try:
        print(f"[GEMINI API CALL] Query={repr(query[:50])}, Proverb={repr(proverb_text)}")
    except:
        print("[GEMINI API CALL] Processing...")

    if not GEMINI_API_KEY or not client:
        print("[GEMINI API] No API key configured, attempting OpenAI fallback")
        return explain_with_openai(query, proverb)

    prompt = f"""
User query: {query}

Proverb: {proverb.get('proverb', '')}
Meaning: {proverb.get('meaning', '')}

Explain clearly:
- Why it matches
- Real-life situation
- Simple explanation
"""

    try:
        print("[Calling Gemini API...]")
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        result = response.text
        print(f"[Gemini API success] {len(result)} characters returned")
        return result
    except Exception as e:
        error_msg = str(e)[:100]
        print(f"[Gemini API error] {error_msg}")
        
        # If Gemini fails (503 or any error), try OpenAI
        if "503" in error_msg or "UNAVAILABLE" in error_msg:
            print("[Gemini 503 error, falling back to OpenAI...]")
            return explain_with_openai(query, proverb)
        
        return None


def explain_with_openai(query, proverb):
    if not OPENAI_API_KEY or not openai_client:
        print("[OpenAI] No API key configured")
        return None
    
    prompt = f"""
User query: {query}

Proverb: {proverb.get('proverb', '')}
Meaning: {proverb.get('meaning', '')}

Explain clearly:
- Why it matches
- Real-life situation
- Simple explanation
"""

    try:
        print("[Calling OpenAI API...]")
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant explaining Telugu proverbs."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        result = response.choices[0].message.content
        print(f"[OpenAI API success] {len(result)} characters returned")
        return result
    except Exception as e:
        print(f"[OpenAI API error] {str(e)[:100]}")
        return None