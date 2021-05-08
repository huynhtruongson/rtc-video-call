const express = require('express');
const { emit } = require('process');
const app = express()
const http = require('http').Server(app);
const io = require('socket.io')(http);
app.use(express.static('public'))
app.set('view engine','pug')
app.get('/',(req,res) => {
    res.render('home')
}) 
const users = []
io.on('connection',socket => {
    socket.on('CLIENT-SEND-USERNAME',(username) => {
        if(!username)
            socket.emit('EMPTY-USERNAME')
        else if(users.some(user => user.username === username))
            socket.emit('DUPLICATED-USERNAME')
        else {
            socket.username = username
            users.push({username,id : socket.id})
            socket.emit('SERVER-SEND-USERLIST',users)
            socket.broadcast.emit('NEW-USER-CONNECT',{username,id : socket.id})
        }
    })
    socket.emit('USER-ID',socket.id)
    socket.on('disconnect',() => {
        users.splice(users.findIndex(user => user.id === socket.id),1)
        io.emit('USER-DISCONNECT',socket.id)
    })
    socket.on("CALL-USER", ({ userToCall, signalData, from}) => {
		io.to(userToCall).emit("CALL-USER", { signal: signalData, from});
	});
    socket.on('ANSWER-CALL',({signal,to}) => {
        io.to(to).emit('CALL-ACCEPT',signal)
    })
    socket.on('DECLINDE-CALL',(to) => {
        io.to(to).emit('DECLINDE-CALL')
    })
})
 const PORT = process.env.PORT || 8080
 http.listen(PORT,() => console.log(`App listening on port ${PORT}`))
 