# Guia: Exclusão em Massa de Clientes

## Funcionalidade Implementada

Foi desenvolvida uma ferramenta para excluir múltiplos clientes/usuários de uma vez no admin do Django, resolvendo o problema de erros de chave estrangeira que ocorria ao excluir usuários cadastrados em massa via Excel.

## Como Usar

### 1. Acesse o Admin do Django
```
http://127.0.0.1:8000/admin/
```

### 2. Navegue até Gestão de Usuários
- Clique em **"Membros Orcoma"** no menu lateral
- Você verá a página **"Gestão de Usuários"** com duas seções:
  - **Membros Orcoma** (staff)
  - **Usuários/Clientes**

### 3. Selecione os usuários para excluir
Você tem duas opções:

#### Opção A: Selecionar individualmente
- Marque as caixas de seleção ao lado de cada usuário que deseja excluir
- O botão "Excluir Selecionados" aparecerá automaticamente com a contagem

#### Opção B: Selecionar todos de uma seção
- Clique na caixa de seleção no cabeçalho da tabela para selecionar todos os usuários daquela seção
- Ex: "Selecionar todos os Membros Orcoma" ou "Selecionar todos os Clientes"

### 4. Clique no botão "Excluir Selecionados"
- O botão aparece em vermelho no topo da página
- Mostra a quantidade de usuários selecionados: `Excluir Selecionados (3)`

### 5. Confirme a exclusão
- Uma mensagem de confirmação aparecerá:
  ```
  Tem certeza que deseja excluir 3 usuário(s)?
  
  Esta ação é PERMANENTE e não pode ser desfeita.
  Todos os dados relacionados (matrículas, certificados, perfis, etc.) serão excluídos.
  ```
- Clique em **"OK"** para confirmar ou **"Cancelar"** para abortar

### 6. Aguarde o processamento
- O sistema irá excluir todos os usuários selecionados
- Você será redirecionado para a lista de usuários
- Uma mensagem de sucesso aparecerá: `X usuário(s) excluído(s) com sucesso.`

## O que é excluído?

Para cada usuário excluído, o sistema remove automaticamente:

### ✅ Dados do Usuário
- **Perfil** (informações corporativas, role, planos)
- **Conta de usuário** (username, email, senha)

### ✅ Dados Educacionais
- **Matrículas** em cursos
- **Certificados** obtidos
- **Formações acadêmicas**
- **Habilidades** cadastradas

### ✅ Dados de Atividade
- **Metas semanais** de estudo
- **Logs de atividade**
- **Notificações**
- **Visualizações de cursos**
- **Avaliações** de módulos

## Características da Exclusão

### 🔒 Segurança
- **Transação atômica**: Se houver erro, NENHUM usuário é excluído (rollback automático)
- **Ordem correta**: Os registros são excluídos na ordem adequada para evitar erros de FK
- **Confirmação dupla**: Você confirma duas vezes antes de excluir

### ⚡ Performance
- Exclusão otimizada em lote
- Processa múltiplos usuários em uma única operação
- Feedback visual imediato

### 🛡️ Proteções
- Não é possível desfazer a exclusão
- Apenas usuários com permissão de staff/admin podem acessar
- CSRF token protegido

## Interface da Página

### Botões Disponíveis
1. **Importar Usuários (Excel)** - Verde
   - Para cadastrar novos usuários em massa
   
2. **Excluir Selecionados** - Vermelho (aparece apenas quando há seleção)
   - Para excluir múltiplos usuários de uma vez

### Checkboxes
- **Por usuário**: Marca/desmarca individualmente
- **Por seção**: "Selecionar todos" no cabeçalho de cada tabela

### Contador Dinâmico
- Mostra em tempo real quantos usuários estão selecionados
- Exemplo: `Excluir Selecionados (5)`

## Exemplos de Uso

### Exemplo 1: Excluir todos os clientes importados via Excel
1. Acesse a página de Gestão de Usuários
2. Clique na checkbox "Selecionar todos" na seção "Usuários/Clientes"
3. Clique em "Excluir Selecionados (X)"
4. Confirme a exclusão

### Exemplo 2: Excluir apenas alguns usuários específicos
1. Acesse a página de Gestão de Usuários
2. Marque individualmente os usuários que deseja excluir (podem ser de ambas as seções)
3. Clique em "Excluir Selecionados (X)"
4. Confirme a exclusão

### Exemplo 3: Excluir membros staff
1. Acesse a página de Gestão de Usuários
2. Clique na checkbox "Selecionar todos" na seção "Membros Orcoma"
3. Clique em "Excluir Selecionados (X)"
4. Confirme a exclusão

## Solução de Problemas

### Erro ao excluir
Se ocorrer um erro durante a exclusão:
1. Nenhum usuário será excluído (graças à transação atômica)
2. Uma mensagem de erro será exibida
3. Verifique os logs do Django para detalhes
4. Tente novamente ou exclua os usuários individualmente

### Botão não aparece
- Certifique-se de que marcou pelo menos uma checkbox
- O botão aparece apenas quando há seleção

### Usuário não é excluído
- Verifique se você tem permissão de staff/admin
- Verifique se o usuário não é o seu próprio usuário logado
- Tente excluir individualmente para ver o erro específico

## Diferença entre Exclusão Individual e em Massa

| Recurso | Individual | Em Massa |
|---------|-----------|----------|
| Acesso | Clicar no ícone de lixeira | Selecionar checkboxes + botão |
| Confirmação | Modal simples | Modal + página de confirmação |
| Quantidade | 1 por vez | Múltiplos de uma vez |
| Segurança | Transação atômica | Transação atômica (todos ou nenhum) |
| Velocidade | Mais lento | Mais rápido (lote) |

## Arquivos Criados/Modificados

### Novos Arquivos
- `backend/core/templates/admin/core/membro_orcoma/excluir_massa.html` - Template de confirmação
- `GUIA_EXCLUSAO_MASSA.md` - Este guia

### Arquivos Modificados
- `backend/core/admin.py` - View `excluir_massa_view` adicionada
- `backend/core/templates/admin/core/membro_orcoma/change_list.html` - Interface com checkboxes e botão

## Próximos Passos (Opcional)

Se quiser melhorar ainda mais a ferramenta:

1. **Filtros avançados**: Adicionar filtros por role, data, status
2. **Preview**: Mostrar quantos registros relacionados cada usuário tem
3. **Exportar lista**: Exportar lista de usuários excluídos para Excel
4. **Log de auditoria**: Registrar quem excluiu quais usuários e quando
5. **Agendamento**: Permitir agendar exclusões para uma data futura

## Suporte

Em caso de dúvidas ou problemas:
1. Verifique este guia
2. Consulte o arquivo `SOLUCAO_EXCLUSAO_USUARIOS.md`
3. Execute o script de teste: `python backend/testar_exclusao_usuario.py`
4. Verifique os logs do Django