# Solução: Exclusão de Usuários Cadastrados em Massa

## Problema Identificado

Ao cadastrar usuários em massa via Excel, não era possível excluí-los pelo admin do Django. O erro ocorria devido a **restrições de chave estrangeira** no banco de dados PostgreSQL.

### Causa do Problema

Quando um usuário é cadastrado, são criados automaticamente vários registros relacionados:
- **Perfil** (obrigatório - criado via signal)
- **Matrículas** (se o usuário se inscrever em cursos)
- **Certificados** (se concluir cursos)
- **Formações Acadêmicas**
- **Habilidades**
- **Metas Semanais**
- **Logs de Atividade**
- **Notificações**
- **Visualizações de Cursos**
- **Avaliações**

O Django Admin padrão não consegue excluir automaticamente todos esses registros na ordem correta, causando erro de integridade do banco.

## Solução Implementada

Foi modificada a view `delete_cliente_view` em `backend/core/admin.py` para:

1. **Deletar registros dependentes na ordem correta:**
   - Primeiro: Certificados (dependem de Matrículas)
   - Segundo: Matrículas, Formações, Habilidades, Metas, Logs, Notificações, Visualizações, Avaliações
   - Terceiro: Perfil
   - Por último: Usuário

2. **Usar transação atômica** para garantir que todas as exclusões aconteçam ou nenhuma (rollback em caso de erro)

3. **Tratar erros gracefully** com mensagens claras para o usuário

## Como Usar

### 1. Acesse o Admin do Django
```
https://seu-dominio.com/admin/
```

### 2. Navegue até a lista de usuários
- Clique em **"Membros Orcoma"** no menu lateral
- Você verá dois grupos:
  - **Staff** (administradores, colaboradores, gestores)
  - **Clientes** (clientes premium, clientes Orcoma, empresários, etc.)

### 3. Exclua um usuário
- Clique no usuário que deseja excluir
- Clique no botão **"Excluir"** (no canto superior direito)
- Confirme a exclusão na página de confirmação
- Clique em **"Sim, tenho certeza"**

### 4. Verifique a mensagem
- Se a exclusão for bem-sucedida, você verá uma mensagem verde:
  ```
  Cliente "Nome do Usuário" excluído com sucesso.
  ```
- Se houver erro, você verá uma mensagem vermelha com detalhes:
  ```
  Erro ao excluir cliente: [detalhes do erro]
  ```

## Observações Importantes

### ⚠️ Dados que serão excluídos permanentemente:
- ✅ Perfil do usuário
- ✅ Todas as matrículas em cursos
- ✅ Todos os certificados
- ✅ Formações acadêmicas
- ✅ Habilidades
- ✅ Metas semanais
- ✅ Logs de atividade
- ✅ Notificações
- ✅ Visualizações de cursos
- ✅ Avaliações de módulos
- ✅ Conta de usuário

### 🔒 Não é possível desfazer:
A exclusão é **permanente**. Certifique-se de que realmente deseja excluir o usuário antes de confirmar.

### 📊 Usuários importados via Excel:
Os usuários cadastrados em massa via Excel podem ser excluídos normalmente agora. O sistema irá remover todos os dados relacionados automaticamente.

## Teste Realizado

Execute o script de teste para verificar se a solução funciona:

```bash
cd backend
python testar_exclusao_usuario.py
```

Este script irá:
1. Buscar usuários com dados relacionados
2. Mostrar quantos registros de cada tipo estão vinculados
3. Confirmar que a exclusão é possível

## Se Ainda Houver Problemas

### Erro de permissão:
Verifique se você tem permissão de **staff** ou **superuser** no Django Admin.

### Erro de banco de dados:
Execute o script de diagnóstico:
```bash
cd backend
python manage.py shell -c "from django.contrib.auth.models import User; from core.models import Perfil; print(f'Total: {User.objects.count()}'); print(f'Com perfil: {User.objects.filter(perfil__isnull=False).count()}')"
```

### Contate o suporte:
Se o problema persistir, verifique:
1. Logs do Django (`logs/` ou console)
2. Mensagem de erro completa
3. ID do usuário que está tentando excluir

## Arquivos Modificados

- `backend/core/admin.py` - View de exclusão customizada
- `backend/testar_exclusao_usuario.py` - Script de teste (novo)

## Próximos Passos (Opcional)

Se você quiser evitar esse problema no futuro, considere:

1. **Adicionar validação no cadastro em massa** para rejeitar usuários com dados inválidos
2. **Criar um comando de limpeza** para remover usuários de teste
3. **Implementar soft delete** (marcar como inativo ao invés de excluir)