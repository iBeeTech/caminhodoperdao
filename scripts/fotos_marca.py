"""
Marca d'agua das prévias da galeria.

Decisao do organizador (06/08/2026): a marca tem que cobrir a foto INTEIRA, para
que print de tela nao renda uma foto limpa. Por isso a trama diagonal repetida,
mais o logo nitido no canto como assinatura.

Duas armadilhas que ja custaram uma rodada de teste e estao resolvidas aqui:

1. Marca branca sozinha SOME em fundo claro (camisa branca, estrada no sol). Por
   isso todo desenho leva um halo escuro atras.
2. O halo tem que ser montado ANTES de aplicar a transparencia da trama. Se a
   transparencia vier primeiro, o halo nasce com 30% de 30% e a marca vira um
   fantasma que quase nao altera pixel nenhum - foi exatamente o que aconteceu no
   primeiro teste (diferenca media de 1 nivel de cinza em 255).
"""
import os
from PIL import Image, ImageOps, ImageFilter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_raw = Image.open(os.path.join(REPO, "src/assets/logo.png")).convert("RGBA")
_raw = _raw.crop(_raw.getchannel("A").getbbox())
# O logo e vertical: simbolo em cima, "CAMINHO DO PERDAO" embaixo, com uma faixa
# vazia entre os dois (linhas 777-821 do recorte).
SIMBOLO = _raw.crop((0, 0, _raw.width, 777))
TEXTO = _raw.crop((0, 821, _raw.width, _raw.height))


def lockup(height: int) -> Image.Image:
    """Marca deitada em branco: simbolo + texto lado a lado."""
    sim = SIMBOLO.resize((max(1, int(SIMBOLO.width * height / SIMBOLO.height)), height), Image.LANCZOS)
    txt_h = max(1, int(height * 0.52))
    txt = TEXTO.resize((max(1, int(TEXTO.width * txt_h / TEXTO.height)), txt_h), Image.LANCZOS)
    gap = int(height * 0.14)
    out = Image.new("RGBA", (sim.width + gap + txt.width, height), (0, 0, 0, 0))
    out.paste(sim, (0, 0), sim)
    out.paste(txt, (sim.width + gap, (height - txt.height) // 2), txt)
    branco = Image.new("RGBA", out.size, (255, 255, 255, 0))
    branco.putalpha(out.getchannel("A"))
    return branco


def com_halo(layer: Image.Image, engorda: int = 3, blur: int = 3, forca: float = 0.85) -> Image.Image:
    """Contorno escuro atras do desenho branco, para ele nao sumir em fundo claro."""
    pad = blur * 4 + engorda
    canvas = Image.new("RGBA", (layer.width + pad * 2, layer.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(layer, (pad, pad), layer)
    halo = canvas.getchannel("A")
    if engorda:
        halo = halo.filter(ImageFilter.MaxFilter(engorda * 2 + 1))
    halo = halo.filter(ImageFilter.GaussianBlur(blur))
    sombra = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sombra.putalpha(halo.point(lambda v: int(v * forca)))
    return Image.alpha_composite(sombra, canvas)


def _transparencia(layer: Image.Image, opacidade: float) -> Image.Image:
    out = layer.copy()
    out.putalpha(out.getchannel("A").point(lambda v: int(v * opacidade)))
    return out


def _engrossar(layer: Image.Image, raio: int = 1) -> Image.Image:
    """Engorda os tracos finos do logo. Sem isto a marca some quando reduzida."""
    if raio <= 0:
        return layer
    out = layer.copy()
    out.putalpha(out.getchannel("A").filter(ImageFilter.MaxFilter(raio * 2 + 1)))
    return out


def marca_dagua(im: Image.Image, opacidade: float = 0.34, altura_ratio: float = 0.09,
                passo: float = 1.08, angulo: int = 30, com_canto: bool = True,
                trama_ligada: bool = True) -> Image.Image:
    """Trama diagonal por toda a foto + logo nitido no canto inferior direito.

    ⚠️ As marcas sao coladas OPACAS e a transparencia so e aplicada no fim, na
    camada inteira. Colar RGBA usando o proprio desenho como mascara multiplica
    alfa por alfa: uma trama de 36% saia com 13% e sumia na foto.
    """
    base = im.convert("RGBA")
    lado = max(base.width, base.height)

    # Album gratuito (2025) nao leva trama: a trama existe para o arquivo em alta
    # nao ser levado de graca, e ali nao ha arquivo em alta para vender - o que
    # existe ja e a versao reduzida. Sobra so a assinatura no canto.
    if not trama_ligada:
        return _com_assinatura(base)

    # --- trama por toda a foto ---
    tile = _engrossar(lockup(max(12, int(lado * altura_ratio))), 1)
    tile = com_halo(tile, engorda=1, blur=2, forca=0.9).rotate(angulo, expand=True, resample=Image.BICUBIC)
    trama = Image.new("RGBA", base.size, (0, 0, 0, 0))
    passo_x, passo_y = int(tile.width * passo), int(tile.height * passo)
    y, linha = -tile.height, 0
    while y < base.height:
        x = -tile.width + (linha % 2) * passo_x // 2
        while x < base.width:
            trama.paste(tile, (x, y), tile)
            x += passo_x
        y += passo_y
        linha += 1
    trama = _transparencia(trama, opacidade)

    # --- assinatura no canto ---
    # Na miniatura ela sai com 30px de altura e vira borrao: nesse tamanho a
    # trama ja carrega a marca sozinha.
    if not com_canto:
        return Image.alpha_composite(base, trama).convert("RGB")

    return _com_assinatura(Image.alpha_composite(base, trama))


def _com_assinatura(base: Image.Image) -> Image.Image:
    """Logo nitido no canto inferior direito."""
    canto_mark = com_halo(lockup(max(16, int(base.width * 0.085))), engorda=2, blur=4, forca=0.85)
    canto = Image.new("RGBA", base.size, (0, 0, 0, 0))
    margem = int(base.width * 0.03)
    canto.paste(canto_mark, (base.width - canto_mark.width - margem, base.height - canto_mark.height - margem))
    canto = _transparencia(canto, 0.95)
    return Image.alpha_composite(base.convert("RGBA"), canto).convert("RGB")


def preview(path: str, lado_maior: int = 1200) -> Image.Image:
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    im.thumbnail((lado_maior, lado_maior), Image.LANCZOS)
    return im
