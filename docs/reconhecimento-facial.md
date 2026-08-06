# Filtro por rosto na galeria — como testar na sua máquina

O peregrino manda uma selfie e a galeria mostra só as fotos em que ele aparece.
Este documento é o passo a passo para **medir se isso funciona** com as fotos de
2026, antes de existir tela nenhuma.

O que se quer descobrir, em uma frase:

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

## 8. Opcional: ver o Worker respondendo

Prova que o servidor devolve o mesmo que o Python:

```bash
npx wrangler r2 object put caminhodoperdao-fotos/faces/2026.bin \
  --file "$PASTA/faces_2026.bin" --local
npx wrangler r2 object put caminhodoperdao-fotos/faces/2026.json \
  --file "$PASTA/faces_2026.json" --content-type=application/json --local

npx wrangler pages dev --port 8788 --r2=PHOTOS=caminhodoperdao-fotos
```

Noutro terminal:

```bash
curl -s "http://127.0.0.1:8788/api/fotos/rosto?ano=2026"
```

O `--local` mantém tudo na sua máquina: **nada disso sobe para o R2 de verdade.**

## Se der errado

| Sintoma | Causa provável |
|---|---|
| `modelo nao encontrado` | faltou `bash scripts/fotos_faces_modelos.sh` |
| `nenhum rosto na selfie` | rosto pequeno, de lado ou escuro — peça outra |
| Acha pouca gente | veja "fotos sem rosto" no passo 4 antes de culpar o limiar |
| Nada bate, nem a própria foto | `.bin` e `.json` de rodadas diferentes; reindexe |
| Busca acha menos que antes | índice e busca com modelos diferentes (cheio × comprimido) |

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

### Duas alavancas ainda não usadas

1. **Ordenar por nota na tela** (a resposta do endpoint já vem ordenada). Mesmo
   com metade errada, as primeiras são as certas: a pessoa reconhece as suas,
   rola até começar o estranho e para. Custa nada e muda a percepção.
2. **Pedir 2 ou 3 selfies** e somar os vetores. É o que mais aumenta a precisão,
   e cabe na mesma tela.

## O que ainda não existe

A **tela**. Hoje o vetor da selfie é gerado aqui na máquina, pelo Python. Na
versão final quem gera é o navegador do peregrino, com o mesmo YuNet e o mesmo
SFace via `opencv.js` — a foto dele não sai do celular, só os 128 números.

O endpoint que recebe esses números (`functions/api/fotos/rosto.ts`) **já está
pronto e testado**. Falta a parte de cima.
