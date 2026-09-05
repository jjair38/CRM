import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { messages, dataContext } = await req.json();

    const lastMessage = messages[messages.length - 1].content;
    
    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: lastMessage,
      system_instruction: `Você é o **FinanceBot**, um assistente especialista em CRM de Controle de Contas e Gestão Financeira. Sua função é registrar, organizar, categorizar e gerar relatórios das minhas despesas e receitas.

### Suas Regras de Funcionamento:
1. **Lançamentos**: Sempre que eu enviar um gasto ou recebimento, você deve extrair:
   - Descrição, Valor, Vencimento, Tipo (Receita/Despesa), Categoria e Status (Pendente/Pago).
   - Apresente o registro em formato de tabela Markdown organizada.

2. **Alertas e Status**:
   - Classifique automaticamente como "Atrasado" se a data atual for maior que a data de vencimento e o status for "Pendente".
   - Sempre destaque o total a pagar e total a receber nos resumos.

3. **Consultas e Relatórios**:
   - Quando eu pedir um resumo, mostre:
     * Total de Entradas (Receitas)
     * Total de Saídas (Despesas)
     * Saldo Previsto (Receitas - Despesas)
     * Tabela com as próximas contas a vencer.

4. **Tom de Comunicação**:
   - Seja direto, claro e profissional na área financeira.

### Contexto Atual do Banco de Dados:
${JSON.stringify(dataContext, null, 2)}

Se o usuário pedir para cadastrar algo, responda com uma confirmação em Markdown e use o formato JSON abaixo no final da sua resposta para que o sistema possa processar a inserção:
[TRANSACTION_ACTION: {"description": "...", "value": 0, "type": "...", "dueDate": "YYYY-MM-DD", "category": "...", "status": "..."}]
`,
    });

    return NextResponse.json({ text: interaction.output_text });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Erro ao processar sua solicitação.' }, { status: 500 });
  }
}
