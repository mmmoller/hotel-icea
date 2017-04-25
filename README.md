# hotel-icea

1) Cria uma pasta /data dentro do /hotel-icea.

2) Abre prompt na pasta bin do mongo (e ajeita o endereço abaixo):
- C:\Program Files\MongoDB\Server\3.4\bin> mongod --dbpath C:\dev\hotel-icea\data

3) Abre outro prompt na pasta /hotel-icea:
- \hotel-icea> npm install
- \hotel-icea> npm start

4) No browser:
- localhost:3000

5) Debugar:
- /delete para deletar todos os dados do BD.
- /admin para criar o admin.
- /criar para criar todos os registros entre duas datas.

6) Shortcuts úteis. (Criar um shortcut, ir em properties e mudar os campos TARGET e START).
- inicializar o DB 
- TARGET: %windir%\system32\cmd.exe /k mongod --dbpath C:\dev\hotel-icea\data
- START: "C:\Program Files\MongoDB\Server\3.4\bin"

- inicializar o Server
- TARGET: %windir%\system32\cmd.exe /k npm start
- START: C:\dev\hotel-icea
