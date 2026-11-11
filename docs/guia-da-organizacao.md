# Guia da organização

Como configurar e operar o SimuLADI durante o evento.
Para a visão geral do projeto, veja o [README](../README.md).

Site para organizar a ordem dos pedidos de fala (oradores, questões e moções) das delegações
na Simulação da ONU das **Ligas Acadêmicas de Direito Internacional da UFF e da UNIRIO**.

Site 100% estático: HTML, CSS e JavaScript. Sem backend próprio, sem servidor para manter.

---

## Páginas

| Endereço | Arquivo | Para quem | O que faz |
|---|---|---|---|
| `/` | `index.html` | Delegações | Escolhe a delegação e valida a senha |
| `/pedido/` | `pedido/index.html` | Delegações | Escolhe questão/moção, entra na fila e acompanha a posição |
| `/painel/` | `painel/index.html` | Mesa diretora / projetor | Quem tem a palavra, questões solicitadas, fila e QR code |
| `/senhas/` | `senhas/index.html` | Organização | Gera senhas aleatórias e seus hashes |

Cada página fica numa pasta com `index.html` dentro. É o que faz o endereço
terminar em `/painel/` em vez de `/painel.html`, e funciona assim em qualquer
hospedagem — inclusive no GitHub Pages, que não converte `.html` sozinho.

---

## Como testar agora (sem instalar nada)

O site precisa ser servido por HTTP — abrir o arquivo direto com duplo clique
quebra a validação de senha (o `crypto.subtle` só funciona em `http://localhost` ou `https://`).

```bash
cd ~/Projetos/simuladi && python3 -m http.server 8000
```

Depois abra `http://localhost:8000` no navegador.

Para ver a fila funcionando, abra **três abas**:

1. `http://localhost:8000` → entre como *Brasil* (senha `ladi-1027`)
2. `http://localhost:8000` → entre como *França* (senha `ladi-2158`)
3. `http://localhost:8000/painel/` → a tela de projeção

Faça um pedido em cada aba e observe a fila se formar. Feche a aba do primeiro
da fila: em poucos segundos o segundo assume a palavra sozinho.

---

## Os dois modos de sincronização

### Modo local (padrão, já ativo)

A fila é guardada no próprio navegador e compartilhada entre abas do **mesmo aparelho**.
Serve para testar e demonstrar. **Não serve para o evento real**, porque os celulares
das delegações não se enxergam.

### Modo Firebase (para o evento)

Necessário para que celulares diferentes compartilhem a mesma fila.
O plano gratuito do Firebase (Spark) é permanente e suporta **100 conexões simultâneas** —
mais do que suficiente para uma simulação. **Não pede cartão de crédito.**

**Passo a passo:**

1. Acesse <https://console.firebase.google.com> e crie um projeto
   (pode desativar o Google Analytics).
2. No menu lateral: **Criar → Realtime Database → Criar banco de dados**.
   Escolha a região `us-central1` e a opção **modo de teste**.
3. Ainda no Realtime Database, aba **Regras**, cole isto e publique:

   ```json
   {
     "rules": {
       "salas": {
         "$sala": {
           "fila": {
             ".read": true,
             ".write": true,
             "$pedido": {
               ".validate": "newData.hasChildren(['delegacao','ordem'])"
             }
           }
         }
       }
     }
   }
   ```

4. Vá em **Configurações do projeto → Seus apps → Web (`</>`)**, registre um app
   e copie o objeto `firebaseConfig`.
5. Cole os valores em `assets/js/config.js`, no bloco `firebase`:

   ```js
   firebase: {
     apiKey: 'AIza...',
     authDomain: 'seu-projeto.firebaseapp.com',
     databaseURL: 'https://seu-projeto-default-rtdb.firebaseio.com',
     projectId: 'seu-projeto'
   },
   ```

Pronto. O site passa a sincronizar entre aparelhos sozinho. Se o Firebase estiver
fora do ar, o site volta para o modo local em vez de quebrar.

> **Sobre as regras acima:** a fila fica aberta para leitura e escrita, sem login.
> É o suficiente para um evento fechado de poucas horas, mas significa que quem
> descobrir o endereço do banco pode escrever nele. Depois do evento, apague o
> Realtime Database no console do Firebase.

---

## Subir para o GitHub

Instale o Git (se ainda não tiver) e rode, dentro da pasta do projeto:

```bash
cd ~/Projetos/simuladi
git init -b main
git add .
git commit -m "Primeira versão do SimuLADI"
```

Crie um repositório vazio em <https://github.com/new> (sem README, sem .gitignore),
copie o endereço que o GitHub mostrar e rode:

```bash
git remote add origin https://github.com/SEU-USUARIO/simuladi.git
git push -u origin main
```

Nas próximas vezes que mudar alguma coisa, são só três comandos:

```bash
git add . && git commit -m "descrição da mudança" && git push
```

---

## Publicar (grátis)

Qualquer hospedagem de site estático serve.

**Opção 1 — GitHub Pages** (integrada ao repositório, atualiza a cada `git push`):
no repositório, vá em **Settings → Pages**, em *Source* escolha **Deploy from a branch**,
selecione a branch `main` e a pasta `/ (root)`, e salve. Em poucos minutos o site
estará em `https://SEU-USUARIO.github.io/simuladi/`.

**Opção 2 — Netlify Drop** (mais rápida, sem Git): arraste a pasta `simuladi`
para <https://app.netlify.com/drop>. Sai no ar em segundos, com HTTPS.

**Opção 3 — Vercel** ou **Cloudflare Pages**: conecte o repositório do GitHub.
Também gratuitos e com deploy automático.

Depois é só apontar `www.simuladi.com.br` para a hospedagem escolhida
(o domínio é o único custo real do projeto).

### Sempre que publicar uma alteração: renove a versão dos arquivos

Os endereços do CSS e do JavaScript nas páginas terminam com `?v=AAAAMMDD`. Esse
número é o que faz o navegador buscar os arquivos novos em vez de reaproveitar os
que já tem em cache. **Se você publicar sem trocá-lo, pode acontecer de o HTML e o
JavaScript virem novos e o CSS vir antigo** — e o layout quebra de um jeito difícil
de entender.

Rode isto na pasta do projeto antes de publicar:

```bash
cd ~/Projetos/simuladi && V=$(date +%Y%m%d%H%M) && sed -i '' -E "s|(assets/(css\|js)/[a-z]+\.[a-z]+\|img/(favicon\|apple-touch-icon\|compartilhar)\.png)(\?v=[0-9]*)?|\1?v=$V|g" index.html */index.html && echo "versão dos arquivos atualizada para $V"
```

Se mesmo assim alguém estiver vendo a versão antiga, um recarregamento forçado
resolve: `Cmd+Shift+R` no Mac, `Ctrl+Shift+R` no Windows.

---

## Personalizar

Tudo o que a organização precisa mudar está em **`assets/js/config.js`**:
delegações, senhas, lista de questões e moções, senha da mesa e nome da sala.

**Imagens** (opcionais, ambas com fallback automático):

- `assets/img/logo.png` — o brasão oficial da LADI, já incluído (192px, fundo
  transparente). Se o arquivo sumir, o site desenha um emblema genérico no lugar.
- `assets/img/favicon.png` e `assets/img/apple-touch-icon.png` — ícone da aba do
  navegador e da tela inicial do celular, gerados a partir do mesmo brasão.
- `assets/img/bg.jpg` — foto do plenário da ONU ao fundo. Sem ela, fica só o gradiente escuro.

**Vários comitês ao mesmo tempo:** cada comitê tem sua própria fila, isolada das
outras, através do parâmetro `?sala=` na URL:

```
https://simuladi.com.br/?sala=conselho-de-seguranca
https://simuladi.com.br/painel/?sala=conselho-de-seguranca
```

---

## Senhas

O arquivo `config.js` já vem com senhas de exemplo em texto simples (`ladi-1027` etc.),
para o site funcionar de imediato. **Elas são visíveis para quem abrir o código-fonte
da página.**

Antes do evento, abra `/senhas/`, clique em *Gerar senhas novas* e:

- cole o bloco gerado no lugar de `delegacoes` em `config.js` (fica só o hash);
- guarde a lista de senhas em texto e entregue a cada delegação a sua.

A **senha da mesa diretora** tem o mesmo problema e a mesma solução: em
`/senhas/` há um campo para gerar o `hashMesa`, que substitui o `senhaMesa`
em texto simples.

Isso impede que uma delegação descubra a senha da outra lendo o código-fonte.
Como não há backend, não existe segurança absoluta: a conferência acontece no
navegador, então alguém com conhecimento técnico consegue contornar. É o
suficiente para impedir trapaça casual num evento acadêmico, não para resistir
a alguém determinado. A solução real seria o Firebase Authentication, que
também é gratuito e sem backend, mas exige criar contas e reescrever as regras
do banco.

---

## Regras da fila (como o site se comporta)

- Existe **uma fila só** de pedidos de fala. Cada pedido é de um tipo: **orador**
  (*Inscrição na Lista de Oradores*), **questão** ou **moção**.
- A ordem é **por chegada**, sem prioridade entre os tipos: quem confirma primeiro
  fica em primeiro. Quem está em primeiro tem a palavra, seja qual for o tipo — não
  há orador falando enquanto uma questão ou moção está sendo feita.
- A tela de projeção **exibe** a fila em duas listas — *Fila de oradores* e *Fila de
  questões e moções* — mas a ordem é uma só. Cada item mostra a **posição global**:
  uma questão em 2º fala antes de um orador em 4º.
- O cartão grande diz o tipo de fala: *Orador com a palavra*, *Questão solicitada*
  ou *Moção solicitada*. Nos dois últimos, o tema aparece abaixo do nome do país.
- Se duas delegações pedirem a **mesma** questão ou moção, cada uma tem a **sua vez**
  de falar, em entradas separadas.
- Só o **primeiro** da fila vê "Sua vez de falar!" — com aviso sonoro e vibração.
- O botão **QR code de acesso**, na tela de projeção, abre um código grande que leva à
  página inicial (mantendo a sala da URL). O código é gerado no próprio navegador,
  sem depender de nenhum serviço externo.
- O endereço do QR é **descoberto sozinho**, a partir de onde a tela de projeção está
  aberta: ao publicar o site, ele passa a apontar para o endereço novo sem precisar
  editar nada. Se a tela de projeção for aberta em `localhost` ou direto do arquivo,
  aparece um aviso vermelho — nesse caso nenhum celular consegue abrir o endereço.
  Para forçar outro endereço (um link curto, por exemplo), preencha `enderecoPublico`
  em `config.js`.
- Ao clicar em **Terminei de falar**, a delegação sai e a próxima assume na hora.
- **Sair da página remove o pedido automaticamente**: fechar a aba, voltar, navegar
  para fora ou recarregar.
- **Apagar a tela do celular NÃO tira ninguém da fila.** A delegação segue inscrita,
  mesmo com o aparelho bloqueado por muito tempo — perder o lugar sem ter feito nada
  seria pior do que qualquer ganho de limpeza automática.
- Em compensação, se o navegador morrer sem avisar (pane, bateria acabando), a
  inscrição fica na fila. A mesa remove pelo **×**, no modo mesa.
- **Recarregar a página também tira o pedido da fila** — é o mesmo que fechar o
  navegador. A delegação precisa pedir de novo.
- Cada delegação aparece **uma vez só** na fila inteira. Um pedido novo substitui o
  anterior e vai para o fim da fila.
- A mesa diretora, após liberar o *Modo mesa* com a senha definida em `config.js`,
  pode remover qualquer pedido pelo **×**, ou usar *Limpar oradores* e *Limpar
  questões*, que removem só os pedidos daquele tipo — incluindo quem está com a
  palavra, se for do tipo limpo.
