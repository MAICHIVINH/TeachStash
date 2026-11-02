import math
from PIL import Image, ImageDraw, ImageFilter

def create_icon(output_path_ico, output_path_png):
    # Render at 1024x1024 for supersampled anti-aliasing
    size = 1024
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Base rounded rectangle (Squircle) with gradient
    # Create gradient background
    grad = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(grad)
    for y in range(size):
        r = int(79 + (55 - 79) * (y / size))    # 4F46E5 -> 3730A3
        g = int(70 + (48 - 70) * (y / size))
        b = int(229 + (163 - 229) * (y / size))
        g_draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Mask for rounded rect with radius 220
    mask = Image.new("L", (size, size), 0)
    m_draw = ImageDraw.Draw(mask)
    margin = 48
    radius = 210
    m_draw.rounded_rectangle([margin, margin, size - margin, size - margin], radius=radius, fill=255)

    # Subtle inner glow / border
    border_mask = Image.new("L", (size, size), 0)
    b_draw = ImageDraw.Draw(border_mask)
    b_draw.rounded_rectangle([margin, margin, size - margin, size - margin], radius=radius, outline=255, width=12)

    # Combine gradient and mask
    icon_bg = Image.composite(grad, Image.new("RGBA", (size, size), (0, 0, 0, 0)), mask)
    
    # Add border overlay
    border_img = Image.new("RGBA", (size, size), (255, 255, 255, 60))
    icon_bg = Image.composite(border_img, icon_bg, border_mask)

    # 2. Draw modern laptop / screen and open book
    content = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    c_draw = ImageDraw.Draw(content)

    # Drop shadow for the central graphics
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)

    # Computer monitor / laptop screen behind the book
    # Monitor frame: cx = 512, top = 220, bottom = 540, width = 580
    sc_left = 220
    sc_top = 220
    sc_right = 804
    sc_bottom = 580
    s_draw.rounded_rectangle([sc_left + 10, sc_top + 16, sc_right + 10, sc_bottom + 16], radius=32, fill=(0, 0, 0, 80))
    
    # Laptop screen exterior (Slate dark 900)
    c_draw.rounded_rectangle([sc_left, sc_top, sc_right, sc_bottom], radius=32, fill=(30, 27, 75, 255), outline=(129, 140, 248, 200), width=8)
    
    # Laptop inner display (Deep glowing blue/indigo)
    disp_margin = 20
    c_draw.rounded_rectangle([sc_left + disp_margin, sc_top + disp_margin, sc_right - disp_margin, sc_bottom - disp_margin], radius=20, fill=(15, 23, 42, 255))
    
    # Display code symbols: </> and mini code lines
    # Code glyph "< />" glowing cyan/teal
    code_cyan = (56, 189, 248, 255)
    c_draw.text((512, 330), "< / >", fill=code_cyan, anchor="mm", font_size=90)
    
    # Mini syntax lines on the screen
    c_draw.rounded_rectangle([290, 410, 430, 422], radius=6, fill=(165, 180, 252, 220))
    c_draw.rounded_rectangle([450, 410, 620, 422], radius=6, fill=(244, 114, 182, 200))
    c_draw.rounded_rectangle([290, 442, 520, 454], radius=6, fill=(52, 211, 153, 200))
    c_draw.rounded_rectangle([540, 442, 730, 454], radius=6, fill=(251, 191, 36, 200))

    # Laptop stand / base
    c_draw.rounded_rectangle([380, 580, 644, 604], radius=8, fill=(99, 102, 241, 255))

    # 3. Open Book in the foreground
    # Left page and right page meeting in center at cx = 512
    # Book covers from y = 520 to y = 840
    # Left page: polygon with curved top and bottom
    book_shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bs_draw = ImageDraw.Draw(book_shadow)
    
    # Outer book cover (Indigo accent)
    cover_left = [
        (512, 570), (220, 530), (190, 810), (512, 860)
    ]
    cover_right = [
        (512, 570), (804, 530), (834, 810), (512, 860)
    ]
    bs_draw.polygon([(x+10, y+16) for x, y in cover_left], fill=(0, 0, 0, 100))
    bs_draw.polygon([(x+10, y+16) for x, y in cover_right], fill=(0, 0, 0, 100))
    
    # Draw cover base
    c_draw.polygon(cover_left, fill=(49, 46, 129, 255))
    c_draw.polygon(cover_right, fill=(49, 46, 129, 255))

    # Left Page (White crisp)
    page_left = [
        (506, 560), (230, 524), (202, 796), (506, 842)
    ]
    c_draw.polygon(page_left, fill=(248, 250, 252, 255), outline=(226, 232, 240, 255))

    # Right Page (White crisp)
    page_right = [
        (518, 560), (794, 524), (822, 796), (518, 842)
    ]
    c_draw.polygon(page_right, fill=(255, 255, 255, 255), outline=(226, 232, 240, 255))

    # Book spine fold shading
    c_draw.polygon([(506, 560), (512, 564), (512, 846), (506, 842)], fill=(203, 213, 225, 255))
    c_draw.polygon([(518, 560), (512, 564), (512, 846), (518, 842)], fill=(226, 232, 240, 255))

    # Text lines on left page (representing lesson plans / giáo án)
    # Left page lines:
    line_color = (148, 163, 184, 255)
    accent_purple = (99, 102, 241, 255)
    c_draw.line([(260, 580), (470, 610)], fill=accent_purple, width=14)
    c_draw.line([(254, 624), (460, 654)], fill=line_color, width=10)
    c_draw.line([(250, 664), (440, 694)], fill=line_color, width=10)
    c_draw.line([(244, 704), (450, 734)], fill=line_color, width=10)
    c_draw.line([(238, 744), (390, 768)], fill=line_color, width=10)

    # Right page lines:
    c_draw.line([(554, 610), (764, 580)], fill=accent_purple, width=14)
    c_draw.line([(564, 654), (770, 624)], fill=line_color, width=10)
    c_draw.line([(584, 694), (774, 664)], fill=line_color, width=10)
    c_draw.line([(574, 734), (780, 704)], fill=line_color, width=10)
    c_draw.line([(634, 768), (786, 744)], fill=line_color, width=10)

    # Small gold graduation bookmark ribbon dangling at bottom
    c_draw.polygon([(512, 700), (530, 700), (534, 880), (521, 866), (508, 880), (512, 700)], fill=(245, 158, 11, 255))

    # Composite layers
    blurred_shadow = shadow.filter(ImageFilter.GaussianBlur(16))
    blurred_book_shadow = book_shadow.filter(ImageFilter.GaussianBlur(14))

    final = Image.alpha_composite(icon_bg, blurred_shadow)
    final = Image.alpha_composite(final, blurred_book_shadow)
    final = Image.alpha_composite(final, content)

    # Save PNG
    final.save(output_path_png, format="PNG")

    # Generate multi-resolution ICO (256, 128, 64, 48, 32, 16)
    sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    icons = []
    for s in sizes:
        resized = final.resize(s, Image.Resampling.LANCZOS)
        icons.append(resized)

    icons[0].save(
        output_path_ico,
        format="ICO",
        sizes=[(s[0], s[1]) for s in sizes],
        append_images=icons[1:]
    )
    print("Created icon successfully:", output_path_ico, output_path_png)

if __name__ == "__main__":
    create_icon("src/GiaoAn.Desktop/app.ico", "web/public/app-icon.png")
