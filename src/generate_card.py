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
        # getbbox returns (left, top, right, bottom)
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
    
    # 1. Download background image
    try:
        r = requests.get(bg_url, timeout=10)
        bg_image = Image.open(BytesIO(r.content))
    except Exception as e:
        print(f"Failed to download background, using default fallback: {e}")
        bg_image = Image.new("RGB", (1000, 1000), (245, 245, 247))
        
    # Resize and crop to 1000x1000 square
    bg_image = bg_image.resize((1000, 1000), Image.Resampling.LANCZOS)
    
    # Apply Gaussian Blur to background for premium look
    bg_blurred = bg_image.filter(ImageFilter.GaussianBlur(15))
    
    # Create translucent white card overlay layer
    overlay = Image.new("RGBA", (1000, 1000), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    
    # Draw central rounded rectangle card (white with 90% opacity)
    card_box = [80, 80, 920, 920]
    overlay_draw.rounded_rectangle(
        card_box,
        radius=30,
        fill=(255, 255, 255, 235),
        outline=(212, 175, 55, 255), # Gold outline
        width=5
    )
    
    # Merge layers
    final_img = Image.alpha_composite(bg_blurred.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(final_img)
    
    # Load fonts
    font_path_bold = "C:/Windows/Fonts/malgunbd.ttf"
    font_path_regular = "C:/Windows/Fonts/malgun.ttf"
    
    # Fallback to system fonts on Linux (GitHub Actions)
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
        
    # Draw Text
    try:
        # Title Font
        if font_path_bold:
            title_font = ImageFont.truetype(font_path_bold, 44)
            header_font = ImageFont.truetype(font_path_bold, 22)
        else:
            title_font = ImageFont.load_default()
            header_font = ImageFont.load_default()
            
        if font_path_regular:
            body_font = ImageFont.truetype(font_path_regular, 26)
        else:
            body_font = ImageFont.load_default()
            
        # Draw Header
        header_text = "💡 셀럽 레시피 카드뉴스"
        h_w = header_font.getbbox(header_text)[2] - header_font.getbbox(header_text)[0]
        draw.text(((1000 - h_w) // 2, 130), header_text, font=header_font, fill=(180, 140, 20))
        
        # Draw Title
        t_w = title_font.getbbox(title)[2] - title_font.getbbox(title)[0]
        draw.text(((1000 - t_w) // 2, 180), title, font=title_font, fill=(20, 20, 20))
        
        # Draw Line separator
        draw.line([200, 260, 800, 260], fill=(212, 175, 55), width=3)
        
        # Process and draw recipe steps/ingredients
        y_cursor = 300
        paragraphs = [p.strip() for p in body_text.split("\n") if p.strip()]
        
        for p in paragraphs:
            # Wrap paragraph lines to fit inside card width
            lines = wrap_text(p, body_font, 720)
            for line in lines:
                if y_cursor > 850:
                    break
                draw.text((140, y_cursor), line, font=body_font, fill=(40, 40, 40))
                y_cursor += 38
            y_cursor += 15 # paragraph spacing
            
        # Draw footer branding
        footer_text = "레시피가 도움이 되었다면 팔로우 해주세요 🙏"
        if font_path_bold:
            footer_font = ImageFont.truetype(font_path_bold, 20)
        else:
            footer_font = ImageFont.load_default()
        f_w = footer_font.getbbox(footer_text)[2] - footer_font.getbbox(footer_text)[0]
        draw.text(((1000 - f_w) // 2, 860), footer_text, font=footer_font, fill=(120, 120, 120))
        
    except Exception as e:
        print(f"Error drawing text: {e}")
        
    # Save output
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    final_img.save(output_path, "JPEG", quality=90)
    print(f"Successfully saved recipe card to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python generate_card.py <title> <body> <bg_url> <output_path>")
        sys.exit(1)
        
    title = sys.argv[1]
    body = sys.argv[2]
    bg_url = sys.argv[3]
    output = sys.argv[4]
    
    generate_card(title, body, bg_url, output)
