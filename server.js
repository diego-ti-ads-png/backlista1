
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// ==========================================
// 1. CONFIGURAÇÕES DO SERVIDOR
// ==========================================

const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// ==========================================
// 2. CONEXÃO COM SUPABASE
// ==========================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

let supabase = null;

function conectarSupabase() {

    if (supabase) {
        return supabase;
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error("Variáveis do Supabase não configuradas.");
    }

    supabase = createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    return supabase;
}

// ==========================================
// 3. VALIDAÇÃO DE ID
// ==========================================

function validarId(id) {
    const numero = Number(id);

    if (!Number.isSafeInteger(numero) || numero <= 0) {
        return null;
    }

    return numero;
}

// ==========================================
// 4. ROTA INICIAL
// ==========================================

app.get("/", (req, res) => {

    res.json({
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
// 5. CREATE - CADASTRAR TAREFA
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

        const db = conectarSupabase();

        const { data, error } = await db
            .from("tarefas")
            .insert([
                {
                    titulo: titulo.trim(),
                    descricao: descricao?.trim() || null,
                    concluida: concluida ?? false
                }
            ])
            .select()
            .single();

        if (error) throw error;

        return res.status(201).json({
            mensagem: "Tarefa cadastrada com sucesso!",
            tarefa: data
        });

    } catch (error) {

        console.error("Erro ao cadastrar:", error);

        return res.status(500).json({
            erro: "Não foi possível cadastrar a tarefa."
        });

    }

});

// ==========================================
// 6. READ - LISTAR TODAS AS TAREFAS
// ==========================================

app.get("/tarefas", async (req, res) => {

    try {

        const db = conectarSupabase();

        const { data, error } = await db
            .from("tarefas")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({
            total: data.length,
            tarefas: data
        });

    } catch (error) {

        console.error("Erro ao listar:", error);

        return res.status(500).json({
            erro: "Não foi possível consultar as tarefas."
        });

    }

});

// ==========================================
// 7. READ - BUSCAR TAREFA POR ID
// ==========================================

app.get("/tarefas/:id", async (req, res) => {

    try {

        const id = validarId(req.params.id);

        if (!id) {
            return res.status(400).json({
                erro: "ID inválido."
            });
        }

        const db = conectarSupabase();

        const { data, error } = await db
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

        console.error("Erro ao buscar:", error);

        return res.status(500).json({
            erro: "Não foi possível buscar a tarefa."
        });

    }

});

// ==========================================
// 8. UPDATE - ATUALIZAR TAREFA
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
                erro: "Título inválido."
            });
        }

        if (
            descricao !== undefined &&
            descricao !== null &&
            typeof descricao !== "string"
        ) {
            return res.status(400).json({
                erro: "Descrição inválida."
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

        const db = conectarSupabase();

        const { data, error } = await db
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

        console.error("Erro ao atualizar:", error);

        return res.status(500).json({
            erro: "Não foi possível atualizar a tarefa."
        });

    }

});

// ==========================================
// 9. DELETE - EXCLUIR TAREFA
// ==========================================

app.delete("/tarefas/:id", async (req, res) => {

    try {

        const id = validarId(req.params.id);

        if (!id) {
            return res.status(400).json({
                erro: "ID inválido."
            });
        }

        const db = conectarSupabase();

        const { data, error } = await db
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

        console.error("Erro ao excluir:", error);

        return res.status(500).json({
            erro: "Não foi possível excluir a tarefa."
        });

    }

});

// ==========================================
// 10. ROTA NÃO ENCONTRADA
// ==========================================

app.use((req, res) => {

    res.status(404).json({
        erro: "Rota não encontrada.",
        caminho: req.originalUrl
    });

});

// ==========================================
// 11. TRATAMENTO DE ERROS
// ==========================================

app.use((err, req, res, next) => {

    console.error("Erro interno:", err);

    if (err instanceof SyntaxError && err.status === 400) {
        return res.status(400).json({
            erro: "O JSON enviado é inválido."
        });
    }

    return res.status(500).json({
        erro: "Erro interno do servidor."
    });

});

// ==========================================
// 12. EXECUÇÃO LOCAL
// ==========================================

// npm start inicia o servidor local.
// Na Vercel, a plataforma gerencia as requisições.

if (require.main === module && process.env.VERCEL !== "1") {

    app.listen(PORT, () => {

        console.log("-----------------------------------");
        console.log(" API LISTA DE TAREFAS INICIADA");
        console.log("-----------------------------------");
        console.log(`Servidor: http://localhost:${PORT}`);
        console.log(`API: http://localhost:${PORT}/tarefas`);
        console.log("-----------------------------------");

    });

}

// ==========================================
// 13. EXPORTAÇÃO PARA VERCEL
// ==========================================

module.exports = app;

