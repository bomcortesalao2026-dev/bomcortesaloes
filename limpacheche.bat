@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ==========================================
echo   Limpador de Cache do Trae + Build
echo   (Preserva senhas e configurações)
echo ==========================================
echo.

:: ==========================================
:: 1. FECHA O TRAE
:: ==========================================
echo [1/5] Verificando se o Trae está em execução...
taskkill /F /IM Trae.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo       Trae foi fechado com sucesso.
    timeout /t 2 /nobreak >nul
) else (
    echo       Trae não estava em execução.
)

:: ==========================================
:: 2. LIMPA CACHE DO TRAE
:: ==========================================
echo.
echo [2/5] Limpando cache do Trae...

set "ROAMING=%APPDATA%\Trae"
set "LOCAL=%LOCALAPPDATA%\Trae"

:: Cache na pasta Local
for %%F in ("Cache" "Code Cache" "GPUCache" "CachedData" "CachedExtensions" "logs") do (
    if exist "%LOCAL%\%%~F" (
        rmdir /S /Q "%LOCAL%\%%~F" 2>nul
        echo       ✓ %%~F limpo
    )
)

:: Cache na pasta Roaming
for %%F in ("Cache" "Code Cache") do (
    if exist "%ROAMING%\%%~F" (
        rmdir /S /Q "%ROAMING%\%%~F" 2>nul
        echo       ✓ Roaming\%%~F limpo
    )
)

:: Arquivos temporários
del /S /Q "%LOCAL%\*.tmp" 2>nul
del /S /Q "%LOCAL%\*.log" 2>nul
echo       ✓ Arquivos temporários removidos

:: ==========================================
:: 3. PERGUNTA QUAL PROJETO LIMPAR
:: ==========================================
echo.
echo [3/5] Escolha a pasta do projeto para limpar o build:
echo.
echo   [1] Usar a pasta ATUAL (onde este .bat está)
echo   [2] Digitar o caminho manualmente
echo   [3] Pular esta etapa (limpar só o cache do Trae)
echo.
set /p OPCAO="Digite 1, 2 ou 3: "

if "%OPCAO%"=="3" goto FIM_BUILD
if "%OPCAO%"=="1" (
    set "PROJETO=%~dp0"
    goto LIMPAR_BUILD
)
if "%OPCAO%"=="2" (
    echo.
    set /p PROJETO="Cole o caminho completo da pasta do projeto: "
    goto LIMPAR_BUILD
)
echo Opção inválida. Pulando limpeza de build...
goto FIM_BUILD

:: ==========================================
:: 4. LIMPA PASTAS DE BUILD DO PROJETO
:: ==========================================
:LIMPAR_BUILD
echo.
echo [4/5] Limpando pastas de build em:
echo       "%PROJETO%"
echo.

:: Remove aspas se existirem no caminho
set "PROJETO=%PROJETO:"=%"

:: Lista de pastas de build comuns
set "PASTAS=dist build .next out .nuxt .output target public/build storybook-static coverage .cache .parcel-cache .turbo"

set "ENCONTRADAS=0"

for %%P in (%PASTAS%) do (
    if exist "%PROJETO%\%%P" (
        rmdir /S /Q "%PROJETO%\%%P" 2>nul
        if !errorlevel! equ 0 (
            echo       ✓ Pasta "%%P" removida
            set /a ENCONTRADAS+=1
        ) else (
            echo       ✗ Não foi possível remover "%%P" (pode estar em uso)
        )
    )
)

if %ENCONTRADAS% equ 0 (
    echo       Nenhuma pasta de build encontrada neste projeto.
) else (
    echo.
    echo       Total de %ENCONTRADAS% pasta(s) de build removida(s).
)

:: Limpa node_modules/.cache também (cache de ferramentas como Vite, Webpack, etc.)
if exist "%PROJETO%\node_modules\.cache" (
    rmdir /S /Q "%PROJETO%\node_modules\.cache" 2>nul
    echo       ✓ node_modules\.cache limpo
)

:: Limpa lockfiles de cache do package manager (opcional, descomente se quiser)
:: if exist "%PROJETO%\.eslintcache" del /Q "%PROJETO%\.eslintcache" 2>nul && echo       ✓ .eslintcache removido
:: if exist "%PROJETO%\tsconfig.tsbuildinfo" del /Q "%PROJETO%\tsconfig.tsbuildinfo" 2>nul && echo       ✓ tsbuildinfo removido

:: ==========================================
:: 5. FINALIZA
:: ==========================================
:FIM_BUILD
echo.
echo [5/5] Concluído!
echo.
echo ==========================================
echo   O que foi PRESERVADO (suas senhas):
echo ==========================================
echo   ✓ Configurações e preferências do Trae
echo   ✓ Extensões instaladas
echo   ✓ Temas e atalhos de teclado
echo   ✓ Credenciais e logins salvos
echo   ✓ Histórico de chat com a IA
echo   ✓ Código-fonte do seu projeto
echo   ✓ node_modules (exceto .cache)
echo   ✓ Arquivos .env e variáveis de ambiente
echo ==========================================
echo.
echo   Pronto! Agora abra o Trae e execute seu app.
echo.
pause