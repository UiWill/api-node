const express = require('express');
const bodyParser = require('body-parser');
const oracledb = require('oracledb');
const os = require('os');

const app = express();
const port = 3333;

app.use(bodyParser.json());

// Obter o caminho do Oracle Instant Client com base no sistema operacional
let libDir = '';
if (os.platform() === 'win32') {
  libDir = 'C:\\instantclient_21_13';
} else if (os.platform() === 'linux') {
  libDir = '/opt/oracle/instantclient_21_14';
} else {
  console.error('Sistema operacional não suportado');
  process.exit(1);
}

// Inicializar o cliente Oracle
oracledb.initOracleClient({ libDir });

// Configuração do banco de dados
const dbConfig = {
  user: 'CLIENTES_CNPJ_NOVO',
  password: 'D_d2017',
  connectString: '18.230.186.194:1521/XE'
};

// Rota para o SELECT
app.get("/", (req, res) => {
  res.send("salve Alek");
});

// Rota para o INSERT
app.post('/notasteste2', async (req, res) => {
  const { valor1, valor2, valor3, valor4, valor5, valor6, valor7, valor8, itens } = req.body;

  let connection;

  try {
    console.log('Recebido POST /notasteste2 com dados:', req.body);

    connection = await oracledb.getConnection(dbConfig);
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    // Verificar e converter valores numéricos
    const id = parseInt(valor1, 10);
    const valor = parseFloat(valor5);

    if (isNaN(id) || isNaN(valor)) {
      throw new Error('Valores numéricos inválidos fornecidos.');
    }

    console.log(`ID convertido: ${id}`);
    console.log(`VALOR convertido: ${valor}`);

    // Inicia uma transação
    await connection.execute('BEGIN');

    const sqlInsertPedido = `INSERT INTO PEDIDO_PAG_SIMPLES (ID, MODOPAGAMENTO, PARCELAS, DATAFULL, VALOR, CAUT_YA07, TBAND_YA06, CNPJ_YA05) VALUES (:id, :modopagamento, :parcelas, :datafull, :valor, :caut_ya07, :tband_ya06, :cnpj_ya05)`;
    let bindsPedido = { 
      id: id, 
      modopagamento: valor2, 
      parcelas: valor3, 
      datafull: valor4, 
      valor: valor, 
      caut_ya07: valor6, 
      tband_ya06: valor7, 
      cnpj_ya05: valor8 
    };
    const options = { autoCommit: false, outFormat: oracledb.OUT_FORMAT_OBJECT };

    console.log('Binds para PEDIDO_PAG_SIMPLES:', bindsPedido);
    await connection.execute(sqlInsertPedido, bindsPedido, options);
    console.log('Inserção em PEDIDO_PAG_SIMPLES realizada com sucesso.');

    if (itens && Array.isArray(itens)) {
      const sqlInsertItens = `INSERT INTO ITENS (ID, ITEM, QTD) VALUES (:id, :item, :qtd)`;
      for (const item of itens) {
        const itemQTD = parseInt(item.qtd, 10);
        console.log(`Item: ${item.item}, QTD: ${itemQTD}`);

        let bindsItem = { 
          id: id, 
          item: item.item, 
          qtd: itemQTD 
        };
        console.log('Binds para ITENS:', bindsItem);
        await connection.execute(sqlInsertItens, bindsItem, options);
      }
      console.log('Inserção em ITENS realizada com sucesso.');
    } else {
      console.log('Nenhum item fornecido para inserção em ITENS.');
    }

    // Commit a transação
    await connection.commit();
    console.log('Transação commitada com sucesso.');

    await connection.close();
    console.log('Conexão com o banco de dados fechada com sucesso.');

    res.status(201).json({ message: 'Inserção realizada com sucesso.' });
  } catch (err) {
    console.error('Erro durante a execução:', err);

    if (connection) {
      try {
        await connection.rollback();
        console.log('Transação revertida com sucesso.');
      } catch (rollbackErr) {
        console.error('Erro durante o rollback:', rollbackErr);
      }
    }

    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
