# SimuLADI

Sistema de fila de oradores para simulações da ONU, no ar em **[simuladi.com.br](https://simuladi.com.br)**.

Numa simulação da ONU, as delegações pedem a palavra levantando placas de papel, e a mesa
diretora precisa decidir no olho quem levantou primeiro. O SimuLADI resolve isso: cada
delegação entra pelo próprio celular, pede a palavra ou registra uma questão/moção, e a
ordem aparece numa tela de projeção que a sala inteira vê.

Feito para a Simulação da ONU organizada pelas Ligas Acadêmicas de Direito Internacional
da UFF e da UNIRIO.

## Telas

| Rota | Função |
|---|---|
| `/` | Entrada: a delegação escolhe o país e digita a senha |
| `/pedido/` | Pede questão ou moção, entra na lista de oradores e acompanha a própria posição |
| `/painel/` | Projeção: quem está com a palavra e a fila, exibida em duas listas — oradores, e questões e moções |
| `/senhas/` | Utilitário para gerar as senhas das delegações em hash |

A fila sincroniza em tempo real entre todos os aparelhos. A mesa diretora libera controles
extras na tela de projeção com uma senha própria.

## Tecnologias

- **HTML, CSS e JavaScript puros** — sem framework, sem etapa de build, sem dependências instaladas
- **Firebase Realtime Database** (SDK 10.12.2) para sincronizar a fila entre aparelhos
- **GitHub Pages** para hospedagem, com domínio próprio
- **Web Crypto (SHA-256)** para as senhas, com implementação própria em JavaScript puro
  como alternativa — o navegador só expõe `crypto.subtle` em contexto seguro
- **Gerador de QR code escrito do zero** (Reed–Solomon sobre GF(256), máscaras e bits de
  formato), sem biblioteca externa
- **Oswald** e **Lato** (Google Fonts)

### Decisões de projeto

- **Sem backend próprio.** O custo de operação é zero: o site é estático e o único serviço
  externo é o plano gratuito do Firebase.
- **Sem build.** O que está no repositório é exatamente o que vai para o ar, o que torna o
  deploy e a depuração triviais.
- **Uma fila só para todo pedido de fala.** Orador, questão e moção entram na mesma
  fila, por ordem de chegada, e só uma pessoa fala por vez. A projeção separa a
  exibição em duas listas, mas cada item mostra a posição global.
- **Camada de sincronização plugável.** `sync.js` expõe a mesma interface sobre dois
  adaptadores: `localStorage` (para desenvolver sozinho) e Firebase (para o evento). A
  escolha é automática, pela presença da chave em `config.js`.
- **Sair da fila é sempre explícito.** A inscrição só é removida por ação da pessoa ou ao
  descartar a página — nunca por queda de conexão, para que ninguém perca a vez de falar
  quando a tela do celular apaga.

## Segurança

Sem backend, quem tem o endereço do banco pode gravar nele diretamente. Por isso:

- **Todo texto vindo do banco é escapado** antes de ir para a tela, e nunca é
  interpretado como HTML.
- As **regras do banco** ([`database.rules.json`](database.rules.json)) permitem
  apenas criar ou apagar pedidos individuais, com campos validados e horário do
  servidor — não dá para alterar o pedido de outro país, furar a fila nem apagar a
  fila inteira.

Limites conhecidos, inerentes a não ter servidor de autenticação: quem souber usar
a API ainda consegue apagar pedidos um a um ou criar pedidos em nome de um país, e
as senhas, embora guardadas como hash, podem ser descobertas por força bruta a
partir do `config.js` público. Fechar isso exige o Firebase Authentication.

## Estrutura

```
index.html            entrada (escolha de delegação e senha)
pedido/               tela do delegado
painel/               tela de projeção
senhas/               gerador de senhas
assets/
  css/style.css       folha de estilo única
  js/
    config.js         delegações, questões, moções e credenciais
    ui.js             utilitários: seletores, sessão, avisos, hash
    sync.js           fila de pedidos de fala, com os dois adaptadores
    pedido.js         lógica da tela do delegado
    painel.js         lógica da tela de projeção
    qr.js             gerador de QR code
  img/                logo, ícones e imagem de compartilhamento
docs/                 guia de operação do evento
database.rules.json   regras de segurança do Firebase
```

## Rodando localmente

Não há nada para instalar. Qualquer servidor estático serve:

```bash
git clone https://github.com/joaopiller/simuladi.git
cd simuladi
python3 -m http.server 8000
```

Abra <http://localhost:8000>.

Com o campo `apiKey` vazio em `config.js`, o site roda em **modo local**: a fila é
compartilhada entre abas do mesmo navegador, o que já basta para desenvolver e testar o
fluxo inteiro sem tocar em nenhum serviço externo.

## Configuração

Tudo que muda de um evento para outro está em [`assets/js/config.js`](assets/js/config.js):
delegações e suas senhas, lista de questões e moções, e as credenciais do Firebase.

As senhas não ficam em texto no código: abra `/senhas/`, gere os hashes SHA-256 e cole o
resultado no `config.js`.

O passo a passo completo de operação — criar o projeto no Firebase, montar as regras do
banco, distribuir as senhas e conduzir a sessão — está em
[`docs/guia-da-organizacao.md`](docs/guia-da-organizacao.md).

## Publicação

O site é publicado pelo GitHub Pages a partir do branch `main`; o domínio fica no arquivo
`CNAME`. Um `git push` já coloca a alteração no ar.

Os arquivos de CSS, JS e os ícones são referenciados com `?v=`, para o navegador não servir
uma versão em cache depois de uma atualização. Renove a versão antes de publicar:

```bash
V=$(date +%Y%m%d%H%M) && sed -i '' -E "s#(assets/(css|js)/[a-z]+\.[a-z]+|img/(favicon|apple-touch-icon|compartilhar)\.png)(\?v=[0-9]*)?#\1?v=$V#g" index.html */index.html
```

(O `sed -i ''` acima é a forma do macOS; no Linux, use `sed -i`.)

## Autor

**João Vicente Piller** — [@joaopiller](https://github.com/joaopiller)
