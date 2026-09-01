# Publicar as fotos de um álbum

As fotos do evento vivem no R2 em quatro prefixos, no mesmo balde
(`caminhodoperdao-fotos`):

| prefixo | lado maior | quem vê |
|---|---|---|
| `thumbs/<ano>/` | 400px | todo mundo — é a grade do álbum |
| `previews/<ano>/` | 1200px | todo mundo — abre ao clicar durante a venda |
| `medias/<ano>/` | **2048px** | todo mundo, **só depois que a venda acaba** |
| `originais/<ano>/` | arquivo da câmera (5–15 MB) | só quem pagou, por link de pedido |

A marca d'água é **gravada no arquivo** pelo script de processamento — nunca é
tarja de CSS, que se contorna abrindo a URL da imagem direto.

## As duas fases de um álbum

**Enquanto vende.** `thumbs` e `previews` saem com a trama por toda a foto. A
trama existe para print de tela não render foto limpa: o que está à venda é o
arquivo em alta, e a foto pública é amostra. `medias` nem vai ao ar — a rota
`/api/fotos/medias/...` responde 404 para ano que ainda vende.

**Depois que a venda acaba.** Não há mais o que proteger. O ano é **regravado
limpo, sem marca nenhuma**, e ganha a média resolução de 2048px, que passa a ser
o que "ampliar" e "baixar" usam. Foi o que 2026 fez em 01/09/2026, por decisão
do organizador.

`GET /api/fotos/album?ano=<ano>` responde `medias: true` quando as duas coisas
valem: o ano parou de vender **e** as fotos já subiram nesse tamanho. É esse
campo que faz a tela apontar para a média.

**Por que 2048px.** Enche qualquer tela de celular ou notebook, imprime bem até
uns 15×20 cm e pesa ~600 KB. Fica claramente abaixo do original de 6000px, que
é o que foi entregue a quem doou.

## ⚠️ Regravou por cima? Suba a versão

As fotos públicas são servidas com cache de **um ano** (`immutable`). Regravar
`previews/2026/foto.jpg` no R2 **não** muda o que o navegador de quem já visitou
mostra, nem o que o CDN guarda.

Quem resolve isso é `VERSAO_DAS_FOTOS`, em `src/services/fotos/fotos.service.ts`:
toda URL de imagem sai com `?v=<número>`. Trocar o número é uma URL nova para o
cache, e a foto nova aparece na hora.

**Toda regravação por cima exige subir esse número.** Foto nova não exige — nome
novo já é URL nova.

## Receita 1 — tirar a marca d'água de um ano (venda encerrada)

Tudo roda na sua máquina; nada disso é automático.

### 1. Baixar os originais do R2

```bash
export PASTA=$HOME/fotos2026
mkdir -p "$PASTA/originais"

curl -s "https://caminhodoperdao.com.br/api/fotos/album?ano=2026" \
  | python3 -c "import json,sys; print('\n'.join(f['n'] for f in json.load(sys.stdin)['fotos']))" \
  > /tmp/fotos2026.txt

xargs -a /tmp/fotos2026.txt -P 16 -I{} sh -c \
  '[ -s "$PASTA/originais/{}" ] || npx wrangler r2 object get \
     "caminhodoperdao-fotos/originais/2026/{}" \
     --file "$PASTA/originais/{}" --remote >/dev/null 2>&1'

ls "$PASTA/originais" | wc -l   # tem de dar 2882
```

São ~11 GB. O `[ -s ... ] ||` pula o que já veio: se a conexão cair, é só rodar
de novo. Se você ainda tem a pasta da vez do reconhecimento facial
(`docs/reconhecimento-facial.md`), pule este passo.

### 2. Gerar as três versões, limpas

```bash
python3 scripts/fotos_processar.py --ano 2026 --pasta "$PASTA" \
  --saidas thumbs,previews,medias --sem-marca --refazer
```

- `--sem-marca` tira a trama **e** a assinatura do canto.
- `--refazer` regrava por cima do que já existe na pasta. Sem isso o script pula
  tudo, porque os arquivos marcados ainda estão lá.

Se você quiser **manter a assinatura do fotógrafo** no canto e tirar só a trama,
troque `--sem-marca` por `--sem-trama`.

Confira duas ou três antes de subir:

```bash
ls -lh "$PASTA/previews/2026" | head
```

### 3. Subir para o R2

```bash
bash scripts/fotos_publicar.sh --ano 2026 --pasta "$PASTA" --reenviar
```

`--reenviar` apaga o registro do que já tinha subido — é o que faz o script
mandar de novo os arquivos que mudaram. Sem ele, o script acha que já está tudo
lá e não faz nada.

O wrangler gasta ~3 s por arquivo, então o script sobe 16 de cada vez. São
~8600 arquivos (três versões): conte perto de uma hora. Se cair, rode o mesmo
comando **sem** `--reenviar`, que ele continua de onde parou.

### 4. Subir a versão e publicar o site

Em `src/services/fotos/fotos.service.ts`, aumente `VERSAO_DAS_FOTOS` em 1 e
anote a linha no histórico do comentário. Depois:

```bash
git commit -am "fix(fotos): 2026 sem marca d'agua"
git push
```

O push na `main` já publica (Cloudflare Pages).

### 5. Conferir

```bash
curl -s "https://caminhodoperdao.com.br/api/fotos/album?ano=2026" | head -c 200
#   tem de aparecer "medias":true

curl -sI "https://caminhodoperdao.com.br/api/fotos/medias/2026/_DSC5746.jpg" | head -3
#   tem de ser 200
```

Abra `/gallery`, entre no álbum e baixe uma foto: tem de vir em 2048px e limpa.

## Receita 2 — publicar um álbum novo (ano em venda)

```bash
# 1. as versões públicas, marcadas (padrão do script)
python3 scripts/fotos_processar.py --ano 2027 --pasta "$PASTA"

# 2. o índice do álbum
python3 scripts/fotos_manifesto.py --ano 2027 --pasta "$PASTA"

# 3. subir só thumbs e previews; medias fica para depois da venda
bash scripts/fotos_publicar.sh --ano 2027 --pasta "$PASTA" --prefixos thumbs,previews
```

Os originais sobem pela página `/upload-fotos`, com link de prazo, direto do
navegador do fotógrafo para o R2 — nunca por WhatsApp ou Telegram, que
recomprimem.

## Custo

Cada versão pesa, para um álbum de 2882 fotos:

- `thumbs` ~40 KB cada → ~115 MB
- `previews` ~200 KB cada → ~580 MB
- `medias` ~600 KB cada → ~1,7 GB
- `originais` → ~11 GB

A US$ 0,015 por GB/mês, a média resolução custa algo como **US$ 0,03 por mês**.
A saída de dados do R2 é gratuita, que é o que importa num álbum feito para as
pessoas baixarem.

## Anos anteriores

2025 não tem média resolução e não vai ter: aqueles arquivos já chegaram
reduzidos (média de 161 KB), não há original de onde tirar 2048px. O álbum
continua entregando a prévia, e a tela diz isso sozinha — `medias` vem `false` e
o texto muda.
