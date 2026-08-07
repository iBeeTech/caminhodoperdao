# Filtro por rosto na galeria

O peregrino manda uma selfie e a galeria mostra só as fotos em que ele aparece.

Este documento tem duas metades. As seções **1 a 8** são o passo a passo para
indexar um álbum e **medir se o resultado presta** antes de anunciar a
funcionalidade — é trabalho que se repete a cada edição. Da seção *"A tela"* em
diante está como a coisa funciona por dentro e como publicar.

A pergunta que a medição responde, em uma frase:

> de quantas fotos da pessoa ele acha, e quantos estranhos entram junto?

## Antes de começar

| | |
|---|---|
| Espaço em disco | 12 GB para o álbum inteiro, 1,2 GB para a amostra |
| Baixar as 2882 fotos | ~45 min |
| Indexar as 2882 fotos | ~16 min (0,33s por foto) |
| Modelos | YuNet (MIT) + SFace (Apache 2.0), uso comercial liberado |

⚠️ **Comece pela amostra.** Uma foto a cada dez já espalha por todo o evento e
responde a pergunta em 10 minutos em vez de uma hora. Se o resultado convencer,
aí sim roda o álbum inteiro.

⚠️ **Não amostre as primeiras fotos.** As da largada são às 4h30, no escuro de
lanterna — em dez delas o detector achou **um** rosto. Uma amostra só do começo
faria o modelo parecer ruim quando o problema é a luz.

## Preparar (uma vez só)

```bash
cd ~/workspace/personal/caminhodoperdao/caminhodoperdao

# ambiente Python, se ainda não existir
python3 -m venv .venv-faces
.venv-faces/bin/pip install opencv-python-headless numpy pillow

# modelos (~50 MB, não entram no git)
bash scripts/fotos_faces_modelos.sh
```

## 1. Pegar a lista das fotos

O manifesto é público, não precisa de senha:

```bash
curl -s "https://caminhodoperdao.com.br/api/fotos/album?ano=2026" \
  | python3 -c "import json,sys; print('\n'.join(f['n'] for f in json.load(sys.stdin)['fotos']))" \
  > /tmp/fotos2026.txt

wc -l < /tmp/fotos2026.txt      # tem que dar 2882
```

## 2. Escolher a amostra

Uma a cada dez, espalhadas do começo ao fim do evento:

```bash
awk 'NR % 10 == 1' /tmp/fotos2026.txt > /tmp/amostra2026.txt
wc -l < /tmp/amostra2026.txt    # 289 fotos
```

Para o álbum inteiro depois, é só usar `/tmp/fotos2026.txt` no lugar deste.

## 3. Baixar do R2

```bash
export PASTA=$HOME/fotos2026
mkdir -p "$PASTA/originais"

xargs -a /tmp/amostra2026.txt -P 16 -I{} sh -c \
  '[ -s "$PASTA/originais/{}" ] || npx wrangler r2 object get \
     "caminhodoperdao-fotos/originais/2026/{}" \
     --file "$PASTA/originais/{}" --remote >/dev/null 2>&1'

ls "$PASTA/originais" | wc -l   # confira se veio tudo
```

O `[ -s ... ] ||` pula o que já baixou: se a conexão cair no meio, é só rodar o
mesmo comando de novo que ele continua de onde parou.

## 4. Indexar os rostos

```bash
.venv-faces/bin/python scripts/fotos_faces.py --ano 2026 --pasta "$PASTA"
```

No fim ele mostra o relatório:

```
fotos lidas .......... 289
rostos indexados ..... ???
fotos sem rosto ...... ???
media de rostos/foto . ???
```

**Já dá para aprender aqui:** se "fotos sem rosto" for a maioria, o filtro vai
frustrar muita gente — e nem adianta seguir para a tela antes de entender por quê
(pouca luz? gente de costas? boné?).

## 5. Arrumar as selfies

Pegue **15 a 20 pessoas que você reconhece** no álbum, uma selfie de cada. Do
Windows, copie para a pasta e traga:

```bash
mkdir -p "$PASTA/selfies"
cp /mnt/c/Users/CassioSilvaTakarada/Downloads/*.jpg "$PASTA/selfies/"
```

Uma pessoa só não calibra nada: o que interessa é ver a fronteira se repetir em
gente diferente.

## 6. Buscar

Uma pessoa por vez:

```bash
.venv-faces/bin/python scripts/fotos_faces_buscar.py \
  --indice "$PASTA" --ano 2026 \
  --selfie "$PASTA/selfies/maria.jpg" \
  --fotos "$PASTA/originais" \
  --mosaico "$PASTA/maria.png" \
  --limiar 0.38
```

Sai a tabela ordenada e um PNG com os rostos lado a lado.

## 7. Olhar e decidir o limiar

```bash
cp "$PASTA"/*.png /mnt/c/Users/CassioSilvaTakarada/Downloads/
```

Abra os PNGs e, para cada pessoa, responda: **a partir de qual nota deixou de ser
ela?**

```
0.99  0.76  0.71  0.59  0.56  |  0.25  0.20
└──────── é ela ───────────┘     └─ outros ─┘
                        ↑
                  a fronteira está aqui
```

Repetindo em 15 pessoas, aparece um padrão. O limiar fica **um pouco abaixo do
pior acerto**, não no meio do vão.

⚠️ **Aperte na dúvida.** Quem não se acha numa foto fica frustrado. Quem recebe a
foto de um estranho como "sua" perde a confiança na galeria inteira — e conta
para os outros.

Achou o número? Ele vai para a variável `PHOTO_FACE_THRESHOLD` no `wrangler.toml`
(sem ela, o padrão é 0,38).

## 8. Ver a tela inteira funcionando na sua máquina

Sobe índice **e** modelos para o R2 da sua máquina e levanta o site:

```bash
npm run build
bash scripts/fotos_faces_publicar.sh --ano 2026 --pasta "$PASTA" --local
npx wrangler pages dev build --port 8788 --r2=PHOTOS=caminhodoperdao-fotos
```

O `--local` mantém tudo aqui: **nada disso sobe para o R2 de verdade.**

Confira o servidor primeiro:

```bash
curl -s "http://127.0.0.1:8788/api/fotos/rosto?ano=2026"
# {"ano":2026,"disponivel":true,"modelo":"sface.onnx","modelo_bytes":38696353,...}
```

Depois abra `http://127.0.0.1:8788/gallery/2026` e use o painel **"Ache as suas
fotos"**. Repare que a primeira busca baixa 39 MB — é o custo real que o
peregrino vai pagar.

## Se der errado

| Sintoma | Causa provável |
|---|---|
| `modelo nao encontrado` | faltou `bash scripts/fotos_faces_modelos.sh` |
| `nenhum rosto na selfie` | rosto pequeno, de lado ou escuro — peça outra |
| Acha pouca gente | veja "fotos sem rosto" no passo 4 antes de culpar o limiar |
| Nada bate, nem a própria foto | `.bin` e `.json` de rodadas diferentes; reindexe |
| Busca acha menos que antes | índice e busca com modelos diferentes (cheio × comprimido) |
| Na tela não casa nada, no Python casa | rode o `fotos_faces_validar_js.mjs`: o JS divergiu do OpenCV |
| Tela diz "não consegui baixar o reconhecedor" | falta subir `modelos/` para o R2 (`fotos_faces_publicar.sh`) |
| Painel de busca não aparece no álbum | o ano não tem índice no R2; confira o GET `/api/fotos/rosto?ano=` |
| `no available backend found` no console | faltou o `npm run build` copiar `public/ort/` (rode `node scripts/copiar-ort-wasm.js`) |

## O que já foi medido (06/08/2026, álbum de 2026 inteiro)

```
fotos ............ 2882          rostos ......... 18.824
sem rosto ........ 346 (12%)     índice ......... 2,4 MB
indexação ........ 15min42       busca no Worker  16 ms
```

Testado com 15 pessoas. **Veredito da organização: alguns resultados 100%
corretos, outros por volta de 50%, aproveitável no geral.**

O que separou o melhor do pior caso não foi o limiar, foi o **tamanho do rosto na
selfie**:

| selfie | resultado |
|---|---|
| 312px | 105 fotos, todas a pessoa certa |
| 130px | 37 fotos, limpas |
| 46px | 79 fotos, quase todas de estranhos |

Daí saiu a regra `MIN_LADO_ROSTO_SELFIE = 100`. A confiança do detector não serve
para pegar esse caso: a selfie de 46px marcou 0,91, tão alto quanto as boas.

Nos casos ruins, os estranhos tinham sempre a mesma marca: **óculos escuros e
boné**. O modelo casa "rosto com metade tapada" com outro rosto igualmente
tapado — e numa caminhada ao sol isso é meio evento.

### Duas alavancas, as duas já na tela

1. **Ordenar por nota.** A grade mostra as fotos na ordem da resposta, da mais
   parecida para a menos, e a tela diz isso em voz alta ("role até começar a
   aparecer gente que não é você e pare por ali"). Mesmo com metade errada, as
   primeiras são as certas.
2. **Somar até 3 selfies.** Os vetores são somados e normalizados de novo
   (`combinarImpressoes`). Cada foto traz um ângulo e uma luz; a média cancela o
   que é da FOTO e deixa o que é da PESSOA — que é exatamente o que faltava nos
   casos ruins, todos de óculos escuro e boné.

## A tela: como funciona por dentro

O peregrino manda a selfie e **a foto não sai do celular**. Os dois modelos são
baixados para o navegador e a impressão digital é calculada lá dentro; o que
viaja são 128 números, dos quais não se remonta imagem nenhuma.

```
selfie (arquivo)
  │  imagem.ts        reduz para 1920 no lado maior, encaixa num quadrado 640
  ▼
YuNet (onnxruntime-web)
  │  deteccao.ts      decodifica 12 tensores -> caixas + 5 pontos, suprime repetidos
  ▼
alinhamento.ts        gira e recorta o rosto em 112x112
  ▼
SFace (onnxruntime-web)
  │  impressaoDigital.ts   normaliza -> 128 números
  ▼
POST /api/fotos/rosto -> as fotos, ordenadas por semelhança
```

**Por que reimplementar detecção e alinhamento em TypeScript.** Nenhum build
pronto de `opencv.js` traz o módulo de rosto — conferido no oficial (11 MB) e no
`@techstark/opencv-js` (13 MB), as classes não estão lá. Então o navegador roda
os mesmos dois `.onnx` pelo `onnxruntime-web`, e o pós-processamento que o OpenCV
fazia sozinho (`postProcess` do detector, `alignCrop` do reconhecedor) virou
código nosso.

**Essa é a peça que falha em silêncio.** Se o JavaScript endireitar de um jeito e
o Python de outro, nada dá erro: os números saem, o Worker responde rápido, e
nenhuma foto casa. Nunca. Por isso existe o validador da seção seguinte — rodá-lo
não é opcional depois de mexer em `deteccao.ts` ou `alinhamento.ts`.

### Conferir a paridade com o Python

```bash
.venv-faces/bin/python scripts/fotos_faces_referencia.py \
  --selfie "$PASTA/selfies/maria.jpg"
node scripts/fotos_faces_validar_js.mjs
```

Três etapas, e as três precisam passar:

```
pixels idênticos  37632/37632  (100.0%)      1. o recorte 112x112 bate
semelhança entre os vetores  1.000000        2. o vetor é o mesmo
rostos no quadrado de 640   python 1  js 1   3. o rosto está no mesmo lugar
maior desvio em pixels        0.000
```

### O peso, e a única alavanca que sobra

| o que baixa | tamanho | quando |
|---|---|---|
| runtime wasm (`/ort/`) | 13 MB (comprime bem) | primeira busca |
| YuNet | 0,2 MB | primeira busca |
| SFace | **39 MB** | primeira busca |

Nada disso é baixado ao abrir o álbum — só depois do toque no botão. O GET de
`/api/fotos/rosto` custa 200 bytes e é o que decide se o painel aparece.

Se 39 MB se mostrar inviável na estrada, a saída é o `sface_int8.onnx` (10 MB),
que o `fotos_faces_modelos.sh` já baixa. **Trocar exige reindexar o álbum inteiro
com ele** (`--reconhecedor scripts/modelos/sface_int8.onnx`): o modelo comprimido
gera vetores um pouco diferentes, e misturar os dois não dá erro nenhum — só faz
a busca achar quase ninguém. A tela se ajusta sozinha, porque o nome do modelo
vem do índice.

## Publicar em produção

```bash
bash scripts/fotos_faces_publicar.sh --ano 2026 --pasta "$PASTA"
curl -s "https://caminhodoperdao.com.br/api/fotos/rosto?ano=2026"
```

Sobem quatro arquivos, nenhum deles versionado: `faces/2026.bin`,
`faces/2026.json`, `modelos/yunet.onnx` e `modelos/sface.onnx`. O script confere
antes que o `.bin` e o `.json` vieram da mesma rodada do indexador — se
divergirem, cada vetor casa com o nome da foto errada e o peregrino recebe as
fotos de outra pessoa.

⚠️ **O nome do modelo é a versão.** A rota manda cache de um ano, imutável.
Regravar `sface.onnx` com outro conteúdo deixa metade dos celulares com o antigo
guardado, gerando vetores que não casam com o índice. Modelo novo entra com nome
novo.

O índice fica em bucket **privado** e nunca é servido ao navegador. Publicá-lo
tornaria a busca mais simples (o celular baixava e comparava sozinho), mas seria
abrir na internet o banco de rostos de todo mundo que apareceu no evento.
