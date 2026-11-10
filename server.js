
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// ==========================================
// CONFIGURAÇÕES DO SERVIDOR
// ==========================================

const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "10kb" }));

// ==========================================
// CONEXÃO COM SUPABASE
// ==========================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
        "ERRO: Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY."
    );
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    }
);

// ==========================================
// FUNÇÃO DE VALIDAÇÃO DE ID
// ==========================================

function validarId(id) {
    const numero = Number(id);

    if (!Number.isSafeInteger(numero) || numero <= 0) {
        return null;
    }

    return numero;
}

// ==========================================
// ROTA PRINCIPAL
// ==========================================

app.get("/", (req, res) => {
    res.status(200).json({
        mensagem: "API Lista de Tarefas funcionando!",
        status: "online",
        tecnologia: "Node.js + Express + Supabase",
        endpoints: {
            listar: "GET /tarefas",
            buscar: "GET /tarefas/:id",
            cadastrar: "POST /tarefas",
            atualizar: "PUT /tarefas/:id",
            excluir: "DELETE /tarefas/:id"
        }
    });
});

// ==========================================
// CRUD - CREATE
// CADASTRAR TAREFA
// ==========================================

app.post("/tarefas", async (req, res) => {
    try {
        const { titulo, descricao, concluida } = req.body || {};

        if (
            typeof titulo !== "string" ||
            titulo.trim() === "" ||
            titulo.trim().length > 150
        ) {
            return res.status(400).json({
                erro: "Informe um título válido de até 150 caracteres."
            });
        }

        if (
            descricao !== undefined &&
            descricao !== null &&
            typeof descricao !== "string"
        ) {
            return res.status(400).json({
                erro: "A descrição deve ser um texto."
            });
        }

        if (
            concluida !== undefined &&
            typeof concluida !== "boolean"
        ) {
            return res.status(400).json({
                erro: "O campo concluida deve ser verdadeiro ou falso."
            });
        }

        const { data, error } = await supabase
            .from("tarefas")
            .insert({
                titulo: titulo.trim(),
                descricao: descricao?.trim() || null,
                concluida: concluida ?? false
            })
            .select()
            .single();

        if (error) throw error;

        return res.status(201).json({
            mensagem: "Tarefa cadastrada com sucesso!",
            tarefa: data
        });

    } catch (error) {
        console.error("Erro ao cadastrar tarefa:", error);

        return res.status(500).json({
            erro: "Não foi possível cadastrar a tarefa."
        });
    }
});

// ==========================================
// CRUD - READ
// LISTAR TODAS AS TAREFAS
// ==========================================

app.get("/tarefas", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("tarefas")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({
            total: data.length,
            tarefas: data
        });

    } catch (error) {
        console.error("Erro ao listar tarefas:", error);

        return res.status(500).json({
            erro: "Não foi possível consultar as tarefas."
        });
    }
});

// ==========================================
// READ - BUSCAR TAREFA POR ID
// ==========================================

app.get("/tarefas/:id", async (req, res) => {
    try {
        const id = validarId(req.params.id);

        if (!id) {
            return res.status(400).json({
                erro: "ID inválido."
            });
        }

        const { data, error } = await supabase
            .from("tarefas")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                erro: "Tarefa não encontrada."
            });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro ao buscar tarefa:", error);

        return res.status(500).json({
            erro: "Não foi possível buscar a tarefa."
        });
    }
});

// ==========================================
// CRUD - UPDATE
// ATUALIZAR TAREFA
// ==========================================

app.put("/tarefas/:id", async (req, res) => {
    try {
        const id = validarId(req.params.id);

        if (!id) {
            return res.status(400).json({
                erro: "ID inválido."
            });
        }

        const { titulo, descricao, concluida } = req.body || {};

        const camposPermitidos = [
            "titulo",
            "descricao",
            "concluida"
        ];

        const camposRecebidos = Object.keys(req.body || {});

        if (
            camposRecebidos.length === 0 ||
            camposRecebidos.some(
                campo => !camposPermitidos.includes(campo)
            )
        ) {
            return res.status(400).json({
                erro: "Informe campos válidos para atualização."
            });
        }

        if (
            titulo !== undefined &&
            (
                typeof titulo !== "string" ||
                titulo.trim() === "" ||
                titulo.trim().length > 150
            )
        ) {
            return res.status(400).json({
                erro: "Título inválido. Informe até 150 caracteres."
            });
        }

        if (
            descricao !== undefined &&
            descricao !== null &&
            typeof descricao !== "string"
        ) {
            return res.status(400).json({
                erro: "A descrição deve ser um texto."
            });
        }

        if (
            concluida !== undefined &&
            typeof concluida !== "boolean"
        ) {
            return res.status(400).json({
                erro: "O campo concluida deve ser verdadeiro ou falso."
            });
        }

        const atualizacao = {};

        if (titulo !== undefined) {
            atualizacao.titulo = titulo.trim();
        }

        if (descricao !== undefined) {
            atualizacao.descricao = descricao?.trim() || null;
        }

        if (concluida !== undefined) {
            atualizacao.concluida = concluida;
        }

        const { data, error } = await supabase
            .from("tarefas")
            .update(atualizacao)
            .eq("id", id)
            .select()
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                erro: "Tarefa não encontrada."
            });
        }

        return res.status(200).json({
            mensagem: "Tarefa atualizada com sucesso!",
            tarefa: data
        });

    } catch (error) {
        console.error("Erro ao atualizar tarefa:", error);

        return res.status(500).json({
            erro: "Não foi possível atualizar a tarefa."
        });
    }
});

// ==========================================
// CRUD - DELETE
// EXCLUIR TAREFA
// ==========================================

app.delete("/tarefas/:id", async (req, res) => {
    try {
        const id = validarId(req.params.id);

        if (!id) {
            return res.status(400).json({
                erro: "ID inválido."
            });
        }

        const { data, error } = await supabase
            .from("tarefas")
            .delete()
            .eq("id", id)
            .select()
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                erro: "Tarefa não encontrada."
            });
        }

        return res.status(200).json({
            mensagem: "Tarefa excluída com sucesso!",
            tarefa: data
        });

    } catch (error) {
        console.error("Erro ao excluir tarefa:", error);

        return res.status(500).json({
            erro: "Não foi possível excluir a tarefa."
        });
    }
});

// ==========================================
// ROTA NÃO ENCONTRADA
// ==========================================

app.use((req, res) => {
    return res.status(404).json({
        erro: "Rota não encontrada.",
        caminho: req.originalUrl
    });
});

// ==========================================
// TRATAMENTO DE ERROS
// ==========================================

app.use((err, req, res, next) => {
    console.error("Erro interno:", err);

    if (
        err instanceof SyntaxError &&
        err.status === 400
    ) {
        return res.status(400).json({
            erro: "O JSON enviado é inválido."
        });
    }

    return res.status(500).json({
        erro: "Erro interno do servidor."
    });
});

// ==========================================
// EXECUÇÃO LOCAL E VERCEL
// ==========================================

// Quando executar npm start localmente,
// inicia o servidor na porta configurada.
//
// Na Vercel, não inicia app.listen().
// Apenas exporta a aplicação Express.

if (require.main === module) {

    app.listen(PORT, () => {
        console.log("-----------------------------------");
        console.log(" API LISTA DE TAREFAS INICIADA");
        console.log("-----------------------------------");
        console.log(` Servidor: http://localhost:${PORT}`);
        console.log(` API: http://localhost:${PORT}/tarefas`);
        console.log("-----------------------------------");
    });

}

// Exportação para a Vercel
module.exports = app;
