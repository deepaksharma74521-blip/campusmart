import os, glob, json
from PIL import Image
import winocr
import pypdf
import fitz

BASE_DIR = 'shops menu2.0'
output = {}

for folder_name in sorted(os.listdir(BASE_DIR)):
    folder_path = os.path.join(BASE_DIR, folder_name)
    if not os.path.isdir(folder_path):
        continue
    
    print(f"Processing: {folder_name}")
    all_texts = []
    
    # Check for PDFs
    pdf_files = glob.glob(os.path.join(folder_path, '*.pdf'))
    for pdf_file in pdf_files:
        try:
            reader = pypdf.PdfReader(pdf_file)
            pdf_text = ""
            for i, p in enumerate(reader.pages):
                txt = p.extract_text()
                if txt and len(txt.strip()) > 20:
                    pdf_text += f"\n--- Page {i+1} ---\n" + txt
            if len(pdf_text.strip()) > 50:
                all_texts.append(f"PDF ({os.path.basename(pdf_file)}):\n" + pdf_text)
            else:
                # OCR the PDF pages using fitz + winocr
                doc = fitz.open(pdf_file)
                ocr_pdf = ""
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    pix = page.get_pixmap(dpi=150)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    res = winocr.recognize_pil_sync(img)
                    ocr_pdf += f"\n--- Page {page_num+1} ---\n" + res.get('text', '')
                all_texts.append(f"OCR PDF ({os.path.basename(pdf_file)}):\n" + ocr_pdf)
        except Exception as e:
            all_texts.append(f"Error reading PDF {pdf_file}: {e}")

    # Check for images
    img_files = glob.glob(os.path.join(folder_path, '*.jp*g')) + glob.glob(os.path.join(folder_path, '*.png'))
    for img_file in sorted(img_files):
        try:
            img = Image.open(img_file)
            # Try 0 deg
            res0 = winocr.recognize_pil_sync(img)
            t0 = res0.get('text', '').strip()
            # Try 270 deg
            res270 = winocr.recognize_pil_sync(img.rotate(270, expand=True))
            t270 = res270.get('text', '').strip()
            
            chosen_text = t270 if len(t270) > len(t0) * 1.5 else t0
            all_texts.append(f"IMG ({os.path.basename(img_file)}):\n" + chosen_text)
        except Exception as e:
            all_texts.append(f"Error reading IMG {img_file}: {e}")
            
    output[folder_name] = "\n\n".join(all_texts)

with open('extracted_raw_menus.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print("Finished extracting all 16 shops! Saved to extracted_raw_menus.json")
