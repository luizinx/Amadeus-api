# Amadeus

> **Seu assistente inteligente de viagens pessoais**

---

## O que é o Amadeus?

O **Amadeus** é um planejador de viagens com inteligência artificial que age de forma proativa. Ele lê sua agenda, identifica automaticamente quando uma viagem pode ser necessária e cuida de tudo — da proposta à reserva — com uma simples confirmação sua.

---

## Como funciona?

```
📅 Lê sua agenda
      ↓
✈️  Identifica uma possível viagem
      ↓
📋 Monta uma proposta completa
      ↓
❓ Pergunta se você aceita
      ↓
🏨 Reserva tudo automaticamente
```

### 1. Leitura da agenda
O Amadeus monitora sua agenda e detecta eventos que indicam a necessidade de deslocamento — reuniões em outras cidades, conferências, compromissos externos, etc.

### 2. Identificação da viagem
Com base no contexto do evento, o Amadeus identifica origem, destino, datas e duração estimada da viagem.

### 3. Proposta inteligente
O assistente monta uma proposta completa contendo:
- Voos disponíveis (ida e volta)
- Opções de hospedagem
- Transfers e transporte local
- Estimativa de custos

### 4. Confirmação do usuário
O Amadeus apresenta tudo de forma clara e pergunta: **"Deseja que eu reserve?"**

### 5. Reserva automática
Com sua aprovação, o Amadeus realiza todas as reservas: passagens, hotel e serviços adicionais.

---

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| Leitura de agenda | Integração com calendários para detectar viagens |
| Detecção inteligente | Identifica automaticamente eventos que exigem deslocamento |
| Busca de voos | Pesquisa e compara opções de passagens aéreas |
| Busca de hotéis | Encontra hospedagens próximas ao destino |
| Proposta consolidada | Apresenta todas as opções em uma única tela |
| Reserva automatizada | Executa as reservas após confirmação do usuário |

---

## Stack

- **Backend:** Node.js / Python
- **IA:** Claude (Anthropic)
- **Integrações:** Amadeus Travel API, Google Calendar, etc.

---

## Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/amadeus-api.git
cd amadeus-api

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env

# Inicie o projeto
npm run dev
```

---

## Variáveis de ambiente

```env
AMADEUS_API_KEY=
AMADEUS_API_SECRET=
CALENDAR_API_KEY=
ANTHROPIC_API_KEY=
```

---

## Licença

MIT
