import os
import sys
import json
import requests
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import google.generativeai as genai
import dotenv

# Load local environment variables if present
dotenv.load_dotenv()

def wrap_text(text, font, max_width):
    words = text.split()
    lines = []
    current_line = []
    
    for word in words:
        test_line = " ".join(current_line + [word])
        text_w = font.getbbox(test_line)[2] - font.getbbox(test_line)[0]
        if text_w <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [word]
    if current_line:
        lines.append(" ".join(current_line))
    return lines

def parse_recipe_with_gemini(title, body_text):
    """Uses Gemini to parse unstructured storytelling text into a clean recipe format."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY not found in environment, falling back to basic parsing.")
        return None
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        prompt = f"""
        아래 요리 관련 글을 분석해서 카드뉴스 이미지에 들어갈 '핵심 요리 순서(Note) 3가지'와 '주요 재료(Ingredients)'를 한국어로 깔끔하게 추출해줘.
        
        글 제목: "{title}"
        본문 내용:
        "{body_text}"
        
        출력 형식은 반드시 아래 JSON 형식으로만 답해줘 (다른 설명 글 금지):
        {{
          "title": "요리 제목 (예: 오레오 아이스크림)",
          "note": [
            "1단계 설명 (25자 이내)",
            "2단계 설명 (25자 이내)",
            "3단계 설명 (25자 이내)"
          ],
          "ingredients": "재료 목록 (예: 오레오, 생크림, 크림치즈)"
        }}
        """
        
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Clean markdown code block wraps if present
        if response_text.startswith("```"):
            response_text = response_text.replace("```json", "").replace("```", "").strip()
            
        data = json.loads(response_text)
        return data
    except Exception as e:
        print(f"Gemini recipe parsing failed: {e}")
        return None

def generate_card(title, body_text, bg_url, output_path):
    # 1. Try to parse clean recipe structure using Gemini
    parsed_data = parse_recipe_with_gemini(title, body_text)
    
    if parsed_data:
        clean_title = parsed_data.get("title", title)
        note_points = parsed_data.get("note", [])
        ingredients_list = parsed_data.get("ingredients", "식재료")
    else:
        # Fallback to naive parsing if Gemini fails or is not configured
        clean_title = title
        # Clean title prefix
        if "인기 레시피" in clean_title:
            clean_title = clean_title.replace("인기 레시피", "").strip()
            
        paragraphs = [p.strip() for p in body_text.split("\n") if p.strip()]
        note_points = []
        for p in paragraphs:
            if "1." in p or "2." in p or "3." in p or "✔" in p:
                note_points.append(p.replace("1.", "").replace("2.", "").replace("3.", "").replace("✔", "").strip())
        if not note_points:
            note_points = ["재료 믹싱하기", "틀에 담기", "냉동고에 얼려주기"]
            
        ingredients_list = "오레오, 생크림, 크림치즈, 우유"
        
    print(f"Parsed Title: {clean_title}")
    print(f"Parsed Notes: {note_points}")
    print(f"Parsed Ingredients: {ingredients_list}")
    
    # 2. Download background food image
    try:
        r = requests.get(bg_url, timeout=10)
        food_img = Image.open(BytesIO(r.content))
    except Exception as e:
        print(f"Failed to download background, using default fallback: {e}")
        food_img = Image.new("RGB", (660, 420), (220, 220, 220))
        
    # Resize and crop food photo for center panel (660x420)
    food_img = food_img.resize((660, 420), Image.Resampling.LANCZOS)
    
    # Create main 1000x1000 cream paper canvas
    canvas_color = (247, 242, 231) # Warm notebook cream paper
    card = Image.new("RGBA", (1000, 1000), canvas_color + (255,))
    draw = ImageDraw.Draw(card)
    
    # Load fonts
    font_path_bold = "C:/Windows/Fonts/malgunbd.ttf"
    font_path_regular = "C:/Windows/Fonts/malgun.ttf"
    
    # Fallback for Linux (GitHub Actions)
    if not os.path.exists(font_path_bold):
        linux_paths = [
            "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        ]
        font_path_bold = next((p for p in linux_paths if os.path.exists(p)), None)
        
    if not os.path.exists(font_path_regular):
        linux_paths = [
            "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
        ]
        font_path_regular = next((p for p in linux_paths if os.path.exists(p)), None)
        
    # Set font sizes
    if font_path_bold:
        title_font = ImageFont.truetype(font_path_bold, 44)
        subtitle_font = ImageFont.truetype(font_path_bold, 30)
        tag_font = ImageFont.truetype(font_path_bold, 20)
    else:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        tag_font = ImageFont.load_default()
        
    if font_path_regular:
        body_font = ImageFont.truetype(font_path_regular, 24)
        list_font = ImageFont.truetype(font_path_regular, 26)
    else:
        body_font = ImageFont.load_default()
        list_font = ImageFont.load_default()
        
    # Draw Outer Binder Border
    draw.rectangle([30, 30, 970, 970], outline=(225, 215, 195), width=2)
    draw.rectangle([35, 35, 965, 965], outline=(180, 170, 150), width=1)
    
    # Draw Slanted Yellow Tape Tag at top-left
    tape_layer = Image.new("RGBA", (1000, 1000), (0, 0, 0, 0))
    tape_draw = ImageDraw.Draw(tape_layer)
    tape_draw.rectangle([100, 55, 200, 90], fill=(245, 215, 80, 255))
    tape_draw.text((125, 60), "NEW", font=tag_font, fill=(120, 90, 10))
    tape_rotated = tape_layer.rotate(6, resample=Image.Resampling.BICUBIC, center=(150, 72))
    card = Image.alpha_composite(card, tape_rotated)
    draw = ImageDraw.Draw(card)
    
    # Draw Main Title (Brown-Gold Bold)
    title_color = (166, 98, 10)
    title_w = title_font.getbbox(clean_title)[2] - title_font.getbbox(clean_title)[0]
    draw.text(((1000 - title_w) // 2, 90), clean_title, font=title_font, fill=title_color)
    
    # Draw Polaroid Food Photo Frame in Center
    photo_frame_box = [150, 170, 850, 610]
    draw.rectangle(photo_frame_box, fill=(255, 255, 255), outline=(215, 205, 185), width=2)
    card.paste(food_img, (170, 180))
    
    # Draw orange label clip on polaroid corner
    clip_layer = Image.new("RGBA", (1000, 1000), (0, 0, 0, 0))
    clip_draw = ImageDraw.Draw(clip_layer)
    clip_draw.rectangle([780, 520, 910, 560], fill=(238, 150, 75, 255))
    clip_draw.text((800, 528), "RECIPE", font=tag_font, fill=(255, 255, 255))
    clip_rotated = clip_layer.rotate(-10, resample=Image.Resampling.BICUBIC, center=(845, 540))
    card = Image.alpha_composite(card, clip_rotated)
    draw = ImageDraw.Draw(card)
    
    # Draw Bottom Section
    # Draw "Note."
    draw.text((150, 635), "Note.", font=subtitle_font, fill=title_color)
    draw.line([150, 675, 850, 675], fill=(225, 215, 195), width=2)
    
    # Draw Note Checkbox points
    y_cursor = 695
    for note in note_points[:3]:
        draw.text((150, y_cursor), "✔", font=body_font, fill=(238, 150, 75))
        lines = wrap_text(note, body_font, 660)
        for line in lines:
            draw.text((185, y_cursor - 2), line, font=body_font, fill=(40, 40, 40))
            y_cursor += 36
        y_cursor += 10
        
    # Draw "Ingredient"
    y_cursor = max(y_cursor, 835)
    draw.text((150, y_cursor), "Ingredient", font=subtitle_font, fill=title_color)
    
    # Draw Ingredients list
    y_cursor += 45
    if len(ingredients_list) > 80:
        ingredients_list = ingredients_list[:80] + "..."
    draw.text((150, y_cursor), ingredients_list, font=list_font, fill=(60, 60, 60))
    
    # Save Output
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    card.convert("RGB").save(output_path, "JPEG", quality=95)
    print(f"Successfully generated notebook-style recipe card to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1].endswith('.json'):
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            args = json.load(f)
        title = args['title']
        body = args['body']
        bg_url = args['bg_url']
        output = args['output_path']
    else:
        if len(sys.argv) < 5:
            print("Usage: python generate_card.py <title> <body> <bg_url> <output_path> OR python generate_card.py <args.json>")
            sys.exit(1)
        title = sys.argv[1]
        body = sys.argv[2]
        bg_url = sys.argv[3]
        output = sys.argv[4]
    
    generate_card(title, body, bg_url, output)
