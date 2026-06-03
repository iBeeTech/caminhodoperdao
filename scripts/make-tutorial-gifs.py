#!/usr/bin/env python3
"""Gera GIFs animados (passo a passo) explicando como cancelar a camiseta e a inscricao.
Frames sao mockups estilizados das telas (nao screenshots reais), com destaque e legenda.
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 900, 620
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "tutoriais")
os.makedirs(OUT_DIR, exist_ok=True)

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# Paleta
BG = (243, 238, 225)
CARD = (255, 255, 255)
INK = (40, 40, 40)
MUTE = (110, 110, 110)
GREEN = (31, 122, 61)
RED = (185, 28, 28)
OUTLINE = (209, 213, 219)
HILITE = (245, 158, 11)        # destaque (ambar)
CAPTION_BG = (28, 25, 23)


def f(size, bold=False):
    return ImageFont.truetype(FONT_B if bold else FONT, size)


def center_text(d, cx, y, text, font, fill):
    w = d.textlength(text, font=font)
    d.text((cx - w / 2, y), text, font=font, fill=fill)


def rrect(d, box, radius, fill=None, outline=None, width=1):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def button(d, cx, y, w, h, label, color, text_color=(255, 255, 255), highlight=False, pressed=False, fsize=19):
    x0, x1 = cx - w / 2, cx + w / 2
    fill = tuple(max(0, c - 30) for c in color) if pressed else color
    rrect(d, (x0, y, x1, y + h), radius=10, fill=fill)
    center_text(d, cx, y + h / 2 - fsize * 0.58, label, f(fsize, True), text_color)
    if highlight:
        pad = 7 if not pressed else 4
        rrect(d, (x0 - pad, y - pad, x1 + pad, y + h + pad), radius=14, outline=HILITE, width=4)
    return (x1, y + h)  # canto inf direito (p/ cursor)


def input_field(d, cx, y, w, label, value=""):
    x0, x1 = cx - w / 2, cx + w / 2
    h = 48
    rrect(d, (x0, y, x1, y + h), radius=10, fill=(249, 250, 251), outline=OUTLINE, width=2)
    if value:
        d.text((x0 + 16, y + 13), value, font=f(20, True), fill=INK)
    else:
        d.text((x0 + 16, y + 14), label, font=f(18), fill=(170, 170, 170))
    return (x0, x1, y + h)


def cursor(d, x, y):
    # setinha/ponteiro simples
    pts = [(x, y), (x, y + 26), (x + 7, y + 19), (x + 12, y + 30), (x + 16, y + 28), (x + 11, y + 18), (x + 19, y + 17)]
    d.polygon(pts, fill=(20, 20, 20), outline=(255, 255, 255))


def base(step, total, kicker):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # cabecalho
    center_text(d, W / 2, 24, "Caminho do Perdão", f(22, True), GREEN)
    center_text(d, W / 2, 54, kicker, f(17), MUTE)
    # badge passo
    badge = f"Passo {step} de {total}"
    bw = d.textlength(badge, font=f(15, True)) + 28
    rrect(d, (W - bw - 28, 22, W - 28, 52), radius=15, fill=GREEN)
    center_text(d, W - 28 - bw / 2, 29, badge, f(15, True), (255, 255, 255))
    # card central
    rrect(d, (90, 95, W - 90, H - 130), radius=20, fill=CARD, outline=OUTLINE, width=2)
    return img, d


def caption(d, text):
    rrect(d, (60, H - 108, W - 60, H - 40), radius=16, fill=CAPTION_BG)
    # quebra simples em 2 linhas
    words = text.split()
    lines, cur = [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f(20, True)) > W - 160:
            lines.append(cur); cur = w
        else:
            cur = t
    lines.append(cur)
    y = H - 100 if len(lines) > 1 else H - 88
    for ln in lines[:2]:
        center_text(d, W / 2, y, ln, f(20, True), (255, 255, 255))
        y += 30


def screen_title(d, text):
    center_text(d, W / 2, 120, text, f(19, True), INK)


# ----------------- montagem dos passos -----------------

def frame_camiseta(step, pressed=False):
    titles = {
        1: "Camiseta Exclusiva",
        2: "Camiseta Exclusiva",
        3: "Seus pedidos",
        4: "Confirmar",
        5: "Seus pedidos",
    }
    img, d = base(step, 5, "Como cancelar a compra da camiseta")
    screen_title(d, titles[step])
    cx = W / 2
    if step == 1:
        d.text((150, 165), "Vá até a seção da camiseta na página inicial.", font=f(17), fill=MUTE)
        br = button(d, cx, 300, 360, 52, "Visualizar pedidos de camisetas", GREEN, highlight=True, pressed=pressed)
        cursor(d, br[0] - 20, br[1] - 6)
        caption(d, "Clique em “Visualizar pedidos de camisetas”.")
    elif step == 2:
        x0, x1, _ = input_field(d, cx, 200, 360, "Digite seu CPF", "123.456.789-00" if pressed else "123.456.789-00")
        d.text((cx - 180, 175), "CPF", font=f(15, True), fill=MUTE)
        br = button(d, cx, 300, 360, 52, "Visualizar pedidos de camisetas", GREEN, highlight=True, pressed=pressed)
        center_text(d, cx, 372, "Forneça seu CPF para consultar os pedidos.", f(13), MUTE)
        cursor(d, br[0] - 20, br[1] - 6)
        caption(d, "Informe seu CPF e clique para ver os pedidos.")
    elif step == 3:
        rrect(d, (150, 175, W - 150, 320), radius=14, fill=(249, 250, 251), outline=OUTLINE, width=2)
        d.text((170, 195), "1 camiseta M", font=f(19, True), fill=INK)
        d.text((170, 226), "Pedido 001 · R$ 100,00", font=f(15), fill=MUTE)
        rrect(d, (W - 290, 192, W - 172, 224), radius=14, fill=(220, 252, 231))
        center_text(d, W - 231, 199, "Pago", f(14, True), GREEN)
        br = button(d, cx, 262, 240, 46, "Cancelar compra", RED, highlight=True, pressed=pressed)
        cursor(d, br[0] - 20, br[1] - 6)
        caption(d, "Ache o pedido e clique em “Cancelar compra”.")
    elif step == 4:
        rrect(d, (230, 175, W - 230, 340), radius=16, fill=(255, 255, 255), outline=OUTLINE, width=2)
        center_text(d, cx, 205, "Cancelar esta compra?", f(20, True), INK)
        center_text(d, cx, 245, "Esta ação não pode ser desfeita.", f(15), MUTE)
        br = button(d, cx, 285, 200, 46, "Confirmar", RED, highlight=True, pressed=pressed)
        cursor(d, br[0] - 20, br[1] - 6)
        caption(d, "Confirme o cancelamento na janela.")
    else:
        center_text(d, cx, 200, "✓", f(80, True), GREEN)
        center_text(d, cx, 300, "Compra cancelada!", f(24, True), INK)
        center_text(d, cx, 340, "Pronto. Seu pedido foi cancelado.", f(16), MUTE)
        caption(d, "Pronto! A compra da camiseta foi cancelada.")
    return img


def frame_inscricao(step, pressed=False):
    titles = {1: "Inscrição", 2: "Inscrição", 3: "Sua inscrição", 4: "Confirmar", 5: "Sua inscrição"}
    img, d = base(step, 5, "Como cancelar a inscrição")
    screen_title(d, titles[step])
    cx = W / 2
    if step == 1:
        d.text((150, 165), "Na seção de inscrição da página inicial.", font=f(17), fill=MUTE)
        button(d, cx - 118, 290, 210, 60, "Quero me inscrever", (160, 160, 160), fsize=16)
        br = button(d, cx + 118, 290, 210, 60, "Já me inscrevi", GREEN, highlight=True, pressed=pressed, fsize=16)
        cursor(d, br[0] - 34, br[1] - 8)
        caption(d, "Clique em “Já me inscrevi”.")
    elif step == 2:
        d.text((cx - 180, 175), "CPF", font=f(15, True), fill=MUTE)
        input_field(d, cx, 200, 360, "Digite seu CPF", "123.456.789-00")
        br = button(d, cx, 300, 300, 52, "Verificar inscrição", GREEN, highlight=True, pressed=pressed)
        cursor(d, br[0] - 20, br[1] - 6)
        caption(d, "Informe seu CPF e clique em “Verificar inscrição”.")
    elif step == 3:
        rrect(d, (180, 170, W - 180, 250), radius=14, fill=(220, 252, 231), outline=(134, 239, 172), width=2)
        center_text(d, cx, 188, "✓ Inscrição confirmada", f(18, True), GREEN)
        center_text(d, cx, 216, "Pagamento confirmado. Nos vemos no evento!", f(14), (21, 101, 51))
        br = button(d, cx, 285, 240, 48, "Cancelar inscrição", RED, highlight=True, pressed=pressed)
        cursor(d, br[0] - 20, br[1] - 6)
        caption(d, "Role até o fim e clique em “Cancelar inscrição”.")
    elif step == 4:
        rrect(d, (230, 175, W - 230, 340), radius=16, fill=(255, 255, 255), outline=OUTLINE, width=2)
        center_text(d, cx, 205, "Cancelar inscrição?", f(20, True), INK)
        center_text(d, cx, 245, "Esta ação não pode ser desfeita.", f(15), MUTE)
        br = button(d, cx, 285, 200, 46, "Confirmar", RED, highlight=True, pressed=pressed)
        cursor(d, br[0] - 20, br[1] - 6)
        caption(d, "Confirme o cancelamento na janela.")
    else:
        center_text(d, cx, 195, "✓", f(80, True), GREEN)
        center_text(d, cx, 295, "Inscrição cancelada!", f(24, True), INK)
        center_text(d, cx, 335, "Pronto. Sua inscrição foi cancelada.", f(16), MUTE)
        caption(d, "Pronto! Sua inscrição foi cancelada.")
    return img


def build_gif(name, frame_fn, steps=5):
    frames, durations = [], []
    for s in range(1, steps + 1):
        frames.append(frame_fn(s, pressed=False)); durations.append(1700)
        frames.append(frame_fn(s, pressed=True)); durations.append(350)
    out = os.path.join(OUT_DIR, name)
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True)
    print("gerado:", os.path.relpath(out), f"({os.path.getsize(out)//1024} KB)")


build_gif("cancelar-camiseta.gif", frame_camiseta)
build_gif("cancelar-inscricao.gif", frame_inscricao)
