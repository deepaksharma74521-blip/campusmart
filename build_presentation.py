# ==============================================================================
# Campus Mart - Visual Presentation PPTX Generator
# File: build_presentation.py
# Description: Generates 14-Slide 16:9 Widescreen Presentation with visual assets
# ==============================================================================

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    blank_slide_layout = prs.slide_layouts[6]
    img_dir = os.path.join(os.path.dirname(__file__), "assets", "ppt_images")

    # Color Palette
    c_bg = RGBColor(11, 17, 32)          # #0b1120 Deep Navy Background
    c_card = RGBColor(30, 41, 59)        # #1e293b Slate Card
    c_card_inner = RGBColor(15, 23, 42)  # #0f172a Darker Slate
    c_card_border = RGBColor(51, 65, 85) # #334155 Slate Border
    c_orange = RGBColor(234, 88, 12)     # #ea580c Primary Orange
    c_orange_light = RGBColor(253, 186, 116) # #fdba74 Light Orange
    c_blue = RGBColor(2, 132, 199)       # #0284c7 Sky Blue
    c_blue_light = RGBColor(56, 189, 248)# #38bdf8 Light Blue
    c_green = RGBColor(16, 185, 129)     # #10b981 Emerald Green
    c_green_light = RGBColor(110, 231, 183) # #6ee7b7 Light Green
    c_amber = RGBColor(245, 158, 11)     # #f59e0b Amber Gold
    c_purple = RGBColor(168, 85, 247)    # #a855f7 Purple
    c_white = RGBColor(248, 250, 252)    # #f8fafc Crisp White
    c_muted = RGBColor(148, 163, 184)    # #94a3b8 Muted Grey

    def set_bg(slide):
        bg_shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg_shape.fill.solid()
        bg_shape.fill.fore_color.rgb = c_bg
        bg_shape.line.fill.background()
        return bg_shape

    def add_header(slide, tag, title, subtitle=None):
        tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.35), Inches(11.7), Inches(0.35))
        tf_tag = tag_box.text_frame
        tf_tag.word_wrap = True
        tf_tag.margin_top = Inches(0)
        tf_tag.margin_bottom = Inches(0)
        p_tag = tf_tag.paragraphs[0]
        p_tag.text = tag.upper()
        p_tag.font.size = Pt(11)
        p_tag.font.bold = True
        p_tag.font.color.rgb = c_orange

        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.68), Inches(11.7), Inches(0.65))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        tf_title.margin_top = Inches(0)
        tf_title.margin_bottom = Inches(0)
        p_title = tf_title.paragraphs[0]
        p_title.text = title
        p_title.font.size = Pt(22)
        p_title.font.bold = True
        p_title.font.color.rgb = c_white

        if subtitle:
            sub_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.25), Inches(11.7), Inches(0.35))
            tf_sub = sub_box.text_frame
            tf_sub.word_wrap = True
            tf_sub.margin_top = Inches(0)
            tf_sub.margin_bottom = Inches(0)
            p_sub = tf_sub.paragraphs[0]
            p_sub.text = subtitle
            p_sub.font.size = Pt(11)
            p_sub.font.color.rgb = c_muted

    def add_card(slide, left, top, width, height, title, desc, title_color=c_white, icon=None, bg_color=c_card, border_color=c_card_border):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1)

        tb = slide.shapes.add_textbox(Inches(left + 0.18), Inches(top + 0.14), Inches(width - 0.36), Inches(height - 0.28))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0)
        tf.margin_right = Inches(0)
        tf.margin_top = Inches(0)
        tf.margin_bottom = Inches(0)

        p1 = tf.paragraphs[0]
        p1.text = (icon + "  " if icon else "") + title
        p1.font.size = Pt(14)
        p1.font.bold = True
        p1.font.color.rgb = title_color
        p1.space_after = Pt(4)

        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(11)
        p2.font.color.rgb = c_muted
        return card

    # =========================================================================
    # SLIDE 1: COVER / TITLE SLIDE
    # =========================================================================
    s1 = prs.slides.add_slide(blank_slide_layout)
    set_bg(s1)

    tb = s1.shapes.add_textbox(Inches(0.8), Inches(0.8), Inches(6.8), Inches(5.8))
    tf = tb.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "★ BCA 2ND YEAR MINOR PROJECT  •  LIVE ON CAMPUSMART.ONLINE"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = c_orange
    p.space_after = Pt(10)

    p = tf.add_paragraph()
    p.text = "Campus Mart"
    p.font.size = Pt(42)
    p.font.bold = True
    p.font.color.rgb = c_white
    p.space_after = Pt(4)

    p = tf.add_paragraph()
    p.text = "Smart Multi-Vendor Pre-Order & Campus Essentials Ecosystem"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = c_orange_light
    p.space_after = Pt(12)

    p = tf.add_paragraph()
    p.text = "• Order food, snacks & stationery from classroom on smartphone\n• Multi-shop counter order isolation (23 Outlets & 1,974+ Pure Veg items)\n• Live 20-min freshness countdown & Web Audio pickup alerts\n• Gate No. 2 Parcel Concierge & New Look Men's Salon integration\n• Automated Revenue Split (₹2.50 Platform Profit) & Live Cash Ledger"
    p.font.size = Pt(11.5)
    p.font.color.rgb = c_muted
    p.space_after = Pt(20)

    p = tf.add_paragraph()
    p.text = "👤 Presented By: Deepak Sharma   |   Roll No: TCA2568124\n🏛️ Department of Computer Applications (BCA)\n⚡ Tech: Python Flask REST API + MongoDB NoSQL + PWA / APK"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = RGBColor(226, 232, 240)

    hero_img = os.path.join(img_dir, "hero.jpg")
    if os.path.exists(hero_img):
        s1.shapes.add_picture(hero_img, Inches(7.8), Inches(1.1), Inches(4.7), Inches(5.2))

    # =========================================================================
    # SLIDE 2: THE PROBLEM (BREAK TIME CRUNCH)
    # =========================================================================
    s2 = prs.slides.add_slide(blank_slide_layout)
    set_bg(s2)
    add_header(s2, "Current Scenario & Challenges", "The Problem: Canteen Rush & Break Delays", "Why physical counter queuing fails during 15-minute campus lecture intervals")

    add_card(s2, 0.8, 1.8, 6.2, 1.35, "15-Minute Break Bottleneck", "During short lecture breaks, hundreds of students rush to food counters simultaneously, creating extreme congestion.", RGBColor(239, 68, 68), "⏱️")
    add_card(s2, 0.8, 3.25, 6.2, 1.35, "Late Entries & Missed Lectures", "Students wait 20+ minutes at food or stationery counters and arrive late to subsequent academic sessions.", RGBColor(239, 68, 68), "🏃")
    add_card(s2, 0.8, 4.7, 6.2, 1.35, "Distant Gate 2 Parcel Walk", "E-commerce parcels (Amazon, Flipkart) stop at Gate No. 2, forcing students to walk 800m back and forth.", RGBColor(239, 68, 68), "🚶")
    add_card(s2, 0.8, 6.15, 6.2, 0.95, "Cash Handling & Order Mixups", "Handling coins, manual paper slips and delayed food hand-offs causes friction and cold food delivery.", RGBColor(239, 68, 68), "📉")

    queue_img = os.path.join(img_dir, "queue.jpg")
    if os.path.exists(queue_img):
        s2.shapes.add_picture(queue_img, Inches(7.4), Inches(1.8), Inches(5.1), Inches(5.3))

    # =========================================================================
    # SLIDE 3: THE SOLUTION (PRE-ORDER ECOSYSTEM)
    # =========================================================================
    s3 = prs.slides.add_slide(blank_slide_layout)
    set_bg(s3)
    add_header(s3, "Project Objective & Innovation", "The Solution: Digital Pre-Ordering Ecosystem", "Transforming campus food & stationery commerce into an express zero-wait pipeline")

    add_card(s3, 0.8, 1.8, 6.2, 1.35, "Order Directly from Classroom", "Browse hot food, packaged snacks, drinks, and stationery on any mobile browser before break starts.", c_green, "📱")
    add_card(s3, 0.8, 3.25, 6.2, 1.35, "Precise Pickup Slot Scheduling", "Choose immediate preparation or schedule for upcoming break times (e.g. 1:15 PM Lunch Break).", c_blue, "⏰")
    add_card(s3, 0.8, 4.7, 6.2, 1.35, "Zero-Wait Express Pickup", "Walk directly to the designated counter, present digital Token ID on smartphone, collect, and go in 10 seconds!", c_orange, "⚡")
    add_card(s3, 0.8, 6.15, 6.2, 0.95, "Multi-Outlet Aggregation", "Order from 23 independent campus shops with consolidated cart and instant split ledger accounting.", c_purple, "🏪")

    pickup_img = os.path.join(img_dir, "mobile_pickup.jpg")
    if os.path.exists(pickup_img):
        s3.shapes.add_picture(pickup_img, Inches(7.4), Inches(1.8), Inches(5.1), Inches(5.3))

    # =========================================================================
    # SLIDE 4: SCALE & CATALOG SHOWCASE (1,974+ DISHES & 23 SHOPS)
    # =========================================================================
    s4 = prs.slides.add_slide(blank_slide_layout)
    set_bg(s4)
    add_header(s4, "Extensive Catalog Showcase", "Campus Scale: 1,974+ Pure Veg Items Across 23 Outlets", "100% Pure Vegetarian certified menu covering dining, groceries, photocopying, and stationery")

    def add_showcase_item(slide, left, top, w, h, img_name, title, desc, title_col):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(w), Inches(h))
        card.fill.solid()
        card.fill.fore_color.rgb = c_card
        card.line.color.rgb = c_card_border

        img_path = os.path.join(img_dir, img_name)
        if os.path.exists(img_path):
            slide.shapes.add_picture(img_path, Inches(left + 0.15), Inches(top + 0.15), Inches(1.8), Inches(h - 0.3))

        tb = slide.shapes.add_textbox(Inches(left + 2.1), Inches(top + 0.15), Inches(w - 2.25), Inches(h - 0.3))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0)
        tf.margin_top = Inches(0)
        p1 = tf.paragraphs[0]
        p1.text = title
        p1.font.size = Pt(14)
        p1.font.bold = True
        p1.font.color.rgb = title_col
        p1.space_after = Pt(3)

        p2 = tf.add_paragraph()
        p2.text = desc
        p2.font.size = Pt(10.5)
        p2.font.color.rgb = c_muted

    add_showcase_item(s4, 0.8, 1.8, 5.7, 2.5, "food.jpg", "🍔 Canteen Fresh Food (324+ in Rainbow)", "TMU Special Chole Kulcha, Sardar Ji Hub, Paneer Dosa, Deluxe Thali, Biryani, Chole Bhature, Burgers & Rolls.", c_orange)
    add_showcase_item(s4, 6.8, 1.8, 5.7, 2.5, "chocolate.jpg", "🍫 Chocolates & Packed Snacks", "Cadbury Dairy Milk Silk, KitKat, Snickers, Lay's Chips, Kurkure, Oreo, and Maggi Noodles.", c_purple)
    add_showcase_item(s4, 0.8, 4.5, 5.7, 2.5, "drinks.jpg", "🥤 Chilled Beverages & Fresh Juices", "Caffelera Cold Coffee with Ice Cream, Red Bull, Mojito, Sting, Amul Lassi, Fresh Mosambi & Mango Juices.", c_blue)
    add_showcase_item(s4, 6.8, 4.5, 5.7, 2.5, "stationery.jpg", "📚 Stationery & Photo Shop Essentials", "Classmate Spiral Notebooks, Practical Files, Gel Pens, Highlighters, Printing & Photocopy services.", c_green)

    # =========================================================================
    # SLIDE 5: 3-STEP USER WORKFLOW
    # =========================================================================
    s5 = prs.slides.add_slide(blank_slide_layout)
    set_bg(s5)
    add_header(s5, "Intuitive User Experience", "How Campus Mart Works: In 3 Simple Steps", "From classroom pre-order to express zero-queue pickup")

    add_card(s5, 0.8, 1.8, 3.6, 5.2, "1️⃣ Browse & Add to Cart", 
             "• Open progressive web app on smartphone\n\n"
             "• Filter by 23 campus shops or category (Food, Beverages, Stationery, Snacks)\n\n"
             "• 100% Pure Vegetarian campus certified menu\n\n"
             "• Add desired items with custom cooking notes (e.g. 'Extra spicy, no onions')\n\n"
             "• Real-time price and split preview", c_orange, bg_color=c_card)

    add_card(s5, 4.8, 1.8, 3.6, 5.2, "2️⃣ Choose Slot & Checkout", 
             "• Select immediate prep or scheduled break time slot\n\n"
             "• Choose payment: UPI Split Gateway or Cash on Pickup Counter\n\n"
             "• Automatic token generation (e.g. #ORD-104)\n\n"
             "• Instant dispatch to designated shop's kitchen dashboard\n\n"
             "• Auto-deduction commission recorded", c_blue, bg_color=c_card)

    add_card(s5, 8.8, 1.8, 3.6, 5.2, "3️⃣ Express Pickup & Bell", 
             "• Kitchen packs items in advance\n\n"
             "• Web Audio 4-tone chime + Voice announcement rings on student screen\n\n"
             "• Glowing green pickup token pops up\n\n"
             "• Walk to counter, show digital token, grab packed meal in 10 seconds!\n\n"
             "• Rate experience with 1-5 stars", c_green, bg_color=c_card)

    # =========================================================================
    # SLIDE 6: ORDER LIFECYCLE & 20-MIN FRESHNESS
    # =========================================================================
    s6 = prs.slides.add_slide(blank_slide_layout)
    set_bg(s6)
    add_header(s6, "Real-Time Pipeline & Freshness", "Live 4-Stage Tracking & 20-Min Freshness Timer", "Immediate visual, acoustic, and voice status feedback across student and shop screens")

    add_card(s6, 0.8, 1.8, 6.2, 1.15, "1. Placed (Pending)", "Order logged in MongoDB; dispatched to specific shop dashboard.", c_amber, "📝")
    add_card(s6, 0.8, 3.05, 6.2, 1.15, "2. Preparing (Cooking/Packing)", "Shop kitchen prepares hot meal or mart staff packs items.", c_orange, "🍳")
    add_card(s6, 0.8, 4.3, 6.2, 1.15, "3. Ready for Pickup (Alert Triggers)", "Web Audio 4-tone harmonic chime + 20-min freshness timer active!", c_green, "🔔")
    add_card(s6, 0.8, 5.55, 6.2, 1.15, "4. Completed (Handed Over)", "Order marked finished; 4-digit PIN verified & invoice generated.", c_blue, "✅")

    tracker_img = os.path.join(img_dir, "tracker.jpg")
    if os.path.exists(tracker_img):
        s6.shapes.add_picture(tracker_img, Inches(7.4), Inches(1.8), Inches(5.1), Inches(4.9))

    # =========================================================================
    # SLIDE 7: FINTECH REVENUE SPLIT GATEWAY (PROFIT MODEL)
    # =========================================================================
    s7 = prs.slides.add_slide(blank_slide_layout)
    set_bg(s7)
    add_header(s7, "Business Model & Monetization", "Fintech Revenue Split Architecture (Platform Profit)", "Automated ₹5.00 packaging fee distribution model for sustainable platform revenue")

    add_card(s7, 0.8, 1.8, 6.2, 1.35, "₹5.00 Pre-Packaging Fee Model", "Every pre-order includes a nominal ₹5.00 packaging and convenience charge.", c_orange, "💰")
    add_card(s7, 0.8, 3.25, 6.2, 1.35, "₹2.50 Platform Profit (Deepak Sharma)", "₹2.50 is routed directly to the Platform Founder (Deepak) as pure net service commission.", c_green, "👑")
    add_card(s7, 0.8, 4.7, 6.2, 1.35, "₹2.50 Vendor Packaging Cost Share", "₹2.50 is credited to the shopkeeper to cover disposable boxes, carry bags, and cutlery.", c_blue, "📦")
    add_card(s7, 0.8, 6.15, 6.2, 0.95, "Instant Split Routing Simulation", "Supports Razorpay Route / Cashfree Split automated transfers directly to linked bank UPI VPAs.", c_purple, "⚡")

    split_img = os.path.join(img_dir, "revenue_split.jpg")
    if os.path.exists(split_img):
        s7.shapes.add_picture(split_img, Inches(7.4), Inches(1.8), Inches(5.1), Inches(5.3))

    # =========================================================================
    # SLIDE 8: AUTO-DEDUCTION LIVE CASH LEDGER
    # =========================================================================
    s8 = prs.slides.add_slide(blank_slide_layout)
    set_bg(s8)
    add_header(s8, "Commission Security & Cash Management", "Auto-Deduction Live Cash Ledger System", "Solving commission leakage when students pay physical cash at the counter")

    add_card(s8, 0.8, 1.8, 5.7, 2.5, "💵 The Cash Payment Challenge", 
             "When students pay cash on pickup, the shopkeeper collects 100% of the money (Food + ₹5.00 Packaging Fee).\n\n"
             "Without a ledger, the platform owner risks losing the ₹2.50 commission share on cash transactions.", RGBColor(239, 68, 68), bg_color=c_card)

    add_card(s8, 6.8, 1.8, 5.7, 2.5, "⚡ The Auto-Deduction Solution", 
             "• Automatic debt recording: ₹2.50 recorded under shop's 'Pending Commission Due'\n\n"
             "• Automated Offset: Deducted automatically from the shop's next online UPI settlement\n\n"
             "• Zero Commission Leakage for Super Admin Deepak!", c_green, bg_color=c_card)

    add_card(s8, 0.8, 4.5, 5.7, 2.5, "📊 Live Multi-Shop Balances", 
             "Super Admin dashboard provides real-time visibility into all 23 shop ledgers:\n\n"
             "• Total Orders & Gross Merchandise Value (GMV)\n"
             "• Online vs. Cash Orders breakdown\n"
             "• Net Commission Due per outlet", c_blue, bg_color=c_card)

    add_card(s8, 6.8, 4.5, 5.7, 2.5, "🤝 1-Click Manual Settlement", 
             "Super Admin can click 'Settle Cash Ledger' once shopkeeper clears physical cash balances, instantly generating a timestamped audit record.", c_purple, bg_color=c_card)

    # =========================================================================
    # SLIDE 9: MULTI-SHOP ADMIN & SUPER ADMIN CONTROL
    # =========================================================================
    s9 = prs.slides.add_slide(blank_slide_layout)
    set_bg(s9)
    add_header(s9, "Role-Based Access Control (RBAC)", "Multi-Shop Counter Isolation & Super Admin Control", "Dedicated shop accounts with centralized Super Admin authority")

    add_card(s9, 0.8, 1.8, 6.2, 1.35, "Counter-Specific Order Isolation", "Rainbow Canteen, Chai Nagri, or Photo Shop staff only see orders placed for their specific outlet.", c_orange, "🔒")
    add_card(s9, 0.8, 3.25, 6.2, 1.35, "Super Admin Master View (Deepak)", "Deepak Sharma has omniscient master view with an instant shop filter switcher and live revenue charts.", c_blue, "👑")
    add_card(s9, 0.8, 4.7, 6.2, 1.35, "23 Dedicated Shop Admin Logins", "Stored securely in Shop_Admin_Credentials/ folder for each shop manager (e.g. rainbow@campusmart.in).", c_green, "🔑")
    add_card(s9, 0.8, 6.15, 6.2, 0.95, "Staff Approval Workflow", "New counter staff registrations require explicit Super Admin approval before dashboard access.", c_purple, "🛡️")

    admin_img = os.path.join(img_dir, "admin.jpg")
    if os.path.exists(admin_img):
        s9.shapes.add_picture(admin_img, Inches(7.4), Inches(1.8), Inches(5.1), Inches(5.3))

    # =========================================================================
    # SLIDE 10: STUDENT STAR RATINGS & QUALITY ANALYTICS
    # =========================================================================
    s10 = prs.slides.add_slide(blank_slide_layout)
    set_bg(s10)
    add_header(s10, "Customer Feedback & Quality Control", "Student Star Ratings & Sentiment Analytics", "Maintaining high food quality and hygiene standards across campus outlets")

    add_card(s10, 0.8, 1.8, 6.2, 1.45, "⭐ 1-5 Star Interactive Ratings", "Students can rate each completed meal with interactive gold stars directly from their order history.", c_amber)
    add_card(s10, 0.8, 3.45, 6.2, 1.45, "🏷️ 1-Tap Sentiment Tags", "Quick impression feedback tags: '⚡ Fast Pickup', '🍲 Delicious Taste', '✨ Hygienic & Fresh', '📦 Good Packaging'.", c_green)
    add_card(s10, 0.8, 5.1, 6.2, 1.45, "📊 Admin Quality Analytics", "Admin analytics dashboard displays satisfaction trends, total review counts, and 5-star distribution graphs.", c_blue)

    # Score Card
    score_card = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.4), Inches(1.8), Inches(5.1), Inches(4.75))
    score_card.fill.solid()
    score_card.fill.fore_color.rgb = c_card
    score_card.line.color.rgb = c_amber
    score_card.line.width = Pt(2)

    tb = s10.shapes.add_textbox(Inches(7.6), Inches(2.2), Inches(4.7), Inches(4.0))
    tf = tb.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "4.9 / 5.0"
    p.font.size = Pt(40)
    p.font.bold = True
    p.font.color.rgb = c_white
    p.alignment = PP_ALIGN.CENTER

    p = tf.add_paragraph()
    p.text = "★★★★★"
    p.font.size = Pt(28)
    p.font.color.rgb = c_amber
    p.alignment = PP_ALIGN.CENTER
    p.space_after = Pt(12)

    p = tf.add_paragraph()
    p.text = "Verified Campus Rating Score\nBased on 100% Real Student Feedback"
    p.font.size = Pt(13)
    p.font.color.rgb = c_muted
    p.alignment = PP_ALIGN.CENTER
    p.space_after = Pt(16)

    p = tf.add_paragraph()
    p.text = "[⚡ Fast Pickup]  [🍲 Delicious]  [✨ Hygienic]"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = c_green
    p.alignment = PP_ALIGN.CENTER

    # =========================================================================
    # SLIDE 11: ENGINEERING & TECH STACK
    # =========================================================================
    s11 = prs.slides.add_slide(blank_slide_layout)
    set_bg(s11)
    add_header(s11, "Engineering & System Architecture", "Lightweight, Modern Full-Stack Technology", "Zero client-side build complexity; ultra-fast response times on campus Wi-Fi / 4G")

    add_card(s11, 0.8, 1.8, 6.2, 1.35, "Frontend: HTML5 + CSS3 + Vanilla JS", "Clean mobile-first glassmorphism UI; instant page load without downloading 100MB+ node_modules.", c_orange, "🌐")
    add_card(s11, 0.8, 3.25, 6.2, 1.35, "Backend: Python Flask REST API", "24/7 Render Cloud API serving 1,974+ items, orders pipeline, split engine & RBAC.", c_blue, "⚡")
    add_card(s11, 0.8, 4.7, 6.2, 1.35, "Database: MongoDB NoSQL JSON Store", "Flexible JSON document persistence for 26 accounts, 1,974+ pure veg food items & 23 shops.", c_green, "🍃")
    add_card(s11, 0.8, 6.15, 6.2, 0.95, "Audio Engine: Web Audio API & TTS", "Browser-native oscillator chime synthesizer and Text-To-Speech speech synthesis engine.", c_purple, "🔊")

    tech_img = os.path.join(img_dir, "tech.jpg")
    if os.path.exists(tech_img):
        s11.shapes.add_picture(tech_img, Inches(7.4), Inches(1.8), Inches(5.1), Inches(5.3))

    # =========================================================================
    # SLIDE 12: STRATEGIC FUTURE ROADMAP & UPCOMING INNOVATIONS (FUTURE GOALS)
    # =========================================================================
    s12 = prs.slides.add_slide(blank_slide_layout)
    set_bg(s12)
    add_header(s12, "Strategic Vision & Scalability", "🚀 Future Goals & Strategic Project Roadmap", "Expanding Campus Mart into an all-in-one smart campus lifestyle super-app")

    add_card(s12, 0.8, 1.8, 5.7, 5.0, "📦 Gate 2 Smart Parcel Locker Hub", 
             "• Courier packages (Amazon, Flipkart, Bluedart) delivered to Gate No. 2\n\n"
             "• Campus Runner Fleet brings parcels straight to hostel room doors\n\n"
             "• 4-Digit Secret Delivery PIN verification protects every package\n\n"
             "• Automated courier SMS & tracking sync\n\n"
             "• Eliminates 800m daily walking friction for hostellers", c_orange, bg_color=c_card)

    add_card(s12, 6.8, 1.8, 5.7, 5.0, "💈 Men's Salon & Campus Super-App", 
             "• New Look Men's Salon Virtual Queue & zero-wait barber chair reservation\n\n"
             "• Real-time waiting time estimation before leaving hostel room\n\n"
             "• 1-Click Group Bill Split with custom share calculation\n\n"
             "• Direct QR Code scanner for 2-second meal handover\n\n"
             "• Multi-Campus University Expansion across North India", c_blue, bg_color=c_card)

    # =========================================================================
    # SLIDE 13: MEASURED BENEFITS SUMMARY
    # =========================================================================
    s13 = prs.slides.add_slide(blank_slide_layout)
    set_bg(s13)
    add_header(s13, "Measurable Impact & Project Achievements", "Current Campus Impact & Measured Value", "Quantifiable time savings for students and revenue clarity for platform & shop owners")

    add_card(s13, 0.8, 1.8, 5.7, 4.9, "🌟 Key Campus Achievements", 
             "• Saves 15-20 minutes during every lecture break\n\n"
             "• 100% elimination of physical queue bottlenecks\n\n"
             "• Zero missed classes or late lecture entries\n\n"
             "• 100% Pure Vegetarian certified dining across 23 Outlets\n\n"
             "• Automated ₹2.50 revenue split with zero cash leakage\n\n"
             "• Web Audio chimes & synthesized voice pickup alerts", c_green, bg_color=c_card)

    add_card(s13, 6.8, 1.8, 5.7, 4.9, "👑 Business Model Highlights", 
             "• ₹2.50 Platform Profit per pre-order directly to Deepak Sharma\n\n"
             "• ₹2.50 Shopkeeper Packaging Material Share\n\n"
             "• Auto-Deduction Live Cash Ledger protects all cash orders\n\n"
             "• Role-Based Access Control for all 23 campus food/stationery shops\n\n"
             "• High customer satisfaction score (4.9 / 5.0 ⭐)", c_amber, bg_color=c_card)

    # =========================================================================
    # SLIDE 14: CONCLUSION & LIVE DEMONSTRATION / VIVA
    # =========================================================================
    s14 = prs.slides.add_slide(blank_slide_layout)
    set_bg(s14)

    tb = s14.shapes.add_textbox(Inches(1.2), Inches(1.2), Inches(10.9), Inches(5.2))
    tf = tb.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "★ PROJECT SUMMARY & CONCLUSION"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = c_green
    p.alignment = PP_ALIGN.CENTER
    p.space_after = Pt(10)

    p = tf.add_paragraph()
    p.text = "Thank You!"
    p.font.size = Pt(46)
    p.font.bold = True
    p.font.color.rgb = c_white
    p.alignment = PP_ALIGN.CENTER
    p.space_after = Pt(12)

    p = tf.add_paragraph()
    p.text = "Campus Mart successfully bridges the gap between campus students and food outlets,\ndelivering a lightning-fast, queue-free, and digitally automated pre-ordering ecosystem."
    p.font.size = Pt(15)
    p.font.color.rgb = RGBColor(203, 213, 225)
    p.alignment = PP_ALIGN.CENTER
    p.space_after = Pt(24)

    p = tf.add_paragraph()
    p.text = "👤 Presented By: Deepak Sharma  |  Roll No: TCA2568124\n🏛️ Department of Computer Applications (BCA)\n🌐 Live Platform: https://campusmart.online"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = c_orange_light
    p.alignment = PP_ALIGN.CENTER
    p.space_after = Pt(20)

    p = tf.add_paragraph()
    p.text = "💬 Ready for Live Demonstration, Source Code Walkthrough & Viva Q&A"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = c_orange
    p.alignment = PP_ALIGN.CENTER

    output_path = os.path.join(os.path.dirname(__file__), "Campus_Mart_Presentation.pptx")
    prs.save(output_path)
    print(f"[OK] Generated 14-Slide PowerPoint Presentation: {output_path}")

if __name__ == "__main__":
    create_deck()
