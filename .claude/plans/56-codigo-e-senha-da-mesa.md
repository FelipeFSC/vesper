# Plano 56 · Código e senha da mesa online

**Status:** Implementado
**Versão:** 1.x
**Pedido do usuário:** "Conseguimos mudar o código da mesa online?" / "E colocar senha também, quero aumentar a segurança"

## Objetivo
O mestre pode trocar o código da mesa (gerar outro ou digitar um próprio) e pôr uma senha. Com senha, quem tem só o código não entra e não recebe nada da mesa (mapa, fichas, imagens).

## Como funciona hoje
- `js/net.js` `N.genCode()`: 6 caracteres aleatórios (sem 0/O/1/I). O id do PeerJS é `PREFIX + código`.
- `js/main.js` `hostWithRetry()`: usa o código guardado em `localStorage['mesarpg.room']` ou gera um. Ou seja, o mesmo navegador repete sempre o mesmo código. Só muda sozinho se o código estiver ocupado.
- Não há tela para trocar o código nem senha. Quem sabe o código entra: `onHostData` aceita o `hello` e já manda o `welcome` com o estado da mesa.
- O painel da mesa (`js/ui.js`, ~linha 3796) mostra o código e tem os botões Copiar código / Link.

## Proposta

### Código
- Cada vez que a mesa é aberta, o código é um hash aleatório novo de 32 caracteres (`crypto.getRandomValues`). Não é mais guardado em `mesarpg.room`.
- Usa letras maiúsculas, minúsculas e números (62 símbolos): 62^32, cerca de 2^190 combinações. O código deixa de ser passado para maiúsculas (`startPlayer` e `N.join`).
- Os jogadores entram pelo link ou colando o código (botão Copiar).
- Recarregar a página do mestre durante a sessão: mantém o código da sessão (`sessionStorage`), para os jogadores reconectarem.

### Senha
- No mesmo painel, um campo **Senha da mesa** (vazio = sem senha), com olho para mostrar ou esconder.
- Fluxo do jogador:
  1. Ele entra com o código, como hoje.
  2. Se a mesa tem senha, o mestre responde `auth-required` e não manda nada mais.
  3. A tela de entrar mostra o campo de senha. O jogador digita e tenta de novo.
  4. Com a senha errada, aparece "Senha incorreta".
- O mestre só faz `player.upsert` e `welcome` depois de conferir a senha. Até lá, toda mensagem da conexão é ignorada, como já acontece com quem não mandou o `hello`.
- Sem limite de tentativas (decisão do usuário): o código de 32 caracteres e a senha já bastam contra chute.
- Reconexão: o jogador guarda a senha só na memória da página, para reconectar sozinho se a rede cair. Não grava a senha no navegador.
- O link de convite (`?mesa=CÓDIGO`) **não** leva a senha. O mestre manda a senha por outro meio.
- Trocar a senha com a mesa aberta não derruba quem já está dentro. Vale para as próximas entradas e reconexões.
- Clientes antigos (protocolo v1) não sabem mandar senha. Se a mesa tiver senha, eles recebem "atualize a página".

### Onde a senha fica guardada
- Recomendação: no navegador do mestre (`localStorage`), ao lado do código. Ela **não** entra no estado da mesa, então nunca vai para os jogadores nem para a exportação da campanha.

### Limites (deixar claro na wiki)
- A conexão do WebRTC já é criptografada. A senha impede a entrada de quem não foi convidado. Ela não protege contra um jogador convidado que repasse a senha para outra pessoa.
- O servidor público do PeerJS só vê o código, nunca a senha nem os dados da mesa.

## Perguntas para o usuário
Nenhuma: decidido na conversa.

## Mudanças por arquivo
| Arquivo | O que muda |
|---|---|
| `js/net.js` | `N.password`; `hello` com `pass`; checagem antes do `welcome`; mensagens `auth-required` / `auth-failed`; `genCode()` com 32 caracteres aleatórios |
| `js/main.js` | guardar/ler a senha (`mesarpg.roompass`); tela de entrar mostra o campo de senha quando pedida; reconexão reaproveita a senha da memória |
| `js/ui.js` | painel da mesa: campo Senha com olho |
| `index.html` / `css/style.css` | campo de senha na tela "Entrar na mesa online" (escondido até ser pedido) |

## Tutorial, wiki e README
- A wiki ganha a seção "Código e senha da mesa", em Jogar online: como trocar, como pôr senha e os limites acima.
- O tutorial não muda: ele é offline e não tem mesa online.
- No README, uma linha em funcionalidades: "mesa online com senha".

## Testes
- Sem senha: o jogador entra como hoje.
- Com senha certa, o jogador entra. Com senha errada, aparece "Senha incorreta" e ele não recebe `welcome` nem imagens.
- Mudar a senha com o jogador dentro: ele continua conectado. Se ele recarregar a página, a senha nova é pedida.
- Abrir a mesa duas vezes gera dois códigos diferentes de 32 caracteres. O código antigo não acha mais a mesa.
- Tutorial completo (`walk.js`) sem erros.
- 0 processos de teste no fim.

## Resultado
- Feito como acima. Diferença: não há aviso para cliente v1 (ele só não entra numa mesa com senha).
- O modal de senha do jogador tem "Entrar" e "Voltar ao menu". Se for fechado clicando fora, é preciso voltar ao menu para tentar de novo.
- Testado em `tests/network.mjs` (Edge): código de 32 caracteres e diferente a cada geração; sem senha e senha errada (inclusive só maiúscula diferente) não recebem estado nem viram jogador; senha certa entra; trocar a senha não derruba quem está dentro. Fotos da tela de entrar, do painel e do pedido de senha conferidas.
- Wiki e tutorial: ficam para quando o usuário der a função por finalizada.
