import os
import sys
import requests
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont, ImageFilter

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

def generate_card(title, body_text, bg_url, output_path):
    print(f"Generating recipe card: {title} ...")
    
    # 1. Download background food image
    try:
        r = requests.get(bg_url, timeout=10)
        food_img = Image.open(BytesIO(r.content))
    except Exception as e:
        print(f"Failed to download background, using default fallback: {e}")
        food_img = Image.new("RGB", (600, 400), (220, 220, 220))
        
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
        
    # 2. Draw Outer Binder Border
    draw.rectangle([30, 30, 970, 970], outline=(225, 215, 195), width=2)
    draw.rectangle([35, 35, 965, 965], outline=(180, 170, 150), width=1)
    
    # 3. Draw Slanted Yellow Tape Tag at top-left
    # Create separate RGBA layer for rotation
    tape_layer = Image.new("RGBA", (1000, 1000), (0, 0, 0, 0))
    tape_draw = ImageDraw.Draw(tape_layer)
    # Draw yellow tape
    tape_draw.rectangle([100, 55, 200, 90], fill=(245, 215, 80, 255))
    # Write "NEW" inside tape
    tape_draw.text((125, 60), "NEW", font=tag_font, fill=(120, 90, 10))
    # Rotate tape slightly to match example
    tape_rotated = tape_layer.rotate(6, resample=Image.Resampling.BICUBIC, center=(150, 72))
    card = Image.alpha_composite(card, tape_rotated)
    draw = ImageDraw.Draw(card)
    
    # 4. Draw Main Title (Brown-Gold Bold)
    title_color = (166, 98, 10) # Golden brown
    title_w = title_font.getbbox(title)[2] - title_font.getbbox(title)[0]
    draw.text(((1000 - title_w) // 2, 90), title, font=title_font, fill=title_color)
    
    # 5. Draw Polaroid Food Photo Frame in Center
    photo_frame_box = [150, 170, 850, 610]
    draw.rectangle(photo_frame_box, fill=(255, 255, 255), outline=(215, 205, 185), width=2)
    # Paste food image onto frame
    card.paste(food_img, (170, 180))
    
    # Draw a small yellow/orange paper label clip on polaroid corner
    clip_layer = Image.new("RGBA", (1000, 1000), (0, 0, 0, 0))
    clip_draw = ImageDraw.Draw(clip_layer)
    clip_draw.rectangle([780, 520, 910, 560], fill=(238, 150, 75, 255)) # Orange-yellow label
    clip_draw.text((800, 528), "RECIPE", font=tag_font, fill=(255, 255, 255))
    clip_rotated = clip_layer.rotate(-10, resample=Image.Resampling.BICUBIC, center=(845, 540))
    card = Image.alpha_composite(card, clip_rotated)
    draw = ImageDraw.Draw(card)
    
    # 6. Draw Bottom Section
    # Draw "Note."
    draw.text((150, 635), "Note.", font=subtitle_font, fill=title_color)
    # Underline below Note
    draw.line([150, 675, 850, 675], fill=(225, 215, 195), width=2)
    
    # Split body into points
    paragraphs = [p.strip() for p in body_text.split("\n") if p.strip()]
    
    # Filter 3 points for Note
    note_points = []
    ingredient_points = []
    
    for p in paragraphs:
        # If paragraph mentions ingredients or is list of items, split
        if "재료" in p or "준비" in p or "소스" in p or "Ingredient" in p:
            ingredient_points.append(p)
        elif len(note_points) < 3:
            note_points.append(p)
            
    # Fallback if parsing didn't find specific ingredients
    if not ingredient_points:
        ingredient_points = ["오레오, 생크림, 크림치즈, 우유"]
        
    # Draw Note Checkbox points
    y_cursor = 695
    for note in note_points[:3]:
        # Custom orange checkmark
        draw.text((150, y_cursor), "✔", font=body_font, fill=(238, 150, 75))
        # Wrap text line
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
    ing_text = ", ".join(ingredient_points).replace("1.", "").replace("2.", "").replace("3.", "").replace("4.", "").strip()
    # Limit length
    if len(ing_text) > 80:
        ing_text = ing_text[:80] + "..."
    draw.text((150, y_cursor), ing_text, font=list_font, fill=(60, 60, 60))
    
    # Save Output
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    card.convert("RGB").save(output_path, "JPEG", quality=95)
    print(f"Successfully generated notebook-style recipe card to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python generate_card.py <title> <body> <bg_url> <output_path>")
        sys.exit(1)
        
    title = sys.argv[1]
    body = sys.argv[2]
    bg_url = sys.argv[3]
    output = sys.argv[4]
    
    generate_card(title, body, bg_url, output)
