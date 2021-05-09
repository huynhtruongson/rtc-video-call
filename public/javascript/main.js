const socket = io('https://rtc-video-call.herokuapp.com')
let username = sessionStorage.getItem('username')
let userId = null
let stream = null
let call = null
let peerConnect = null
const localVideo = document.getElementById('localStream')
localVideo.muted = true
;(async () => {
    const currentStream = await navigator.mediaDevices.getUserMedia({video : true,audio : true})
    playStream(localVideo,currentStream)
    stream = currentStream
})()
socket.on('USER-ID',id => userId = id)
socket.emit('CLIENT-SEND-USERNAME',username)
socket.on('EMPTY-USERNAME',() => {
    username = prompt('Enter your name')
    socket.emit('CLIENT-SEND-USERNAME',username)
})
socket.on('DUPLICATED-USERNAME',() => {
    alert('Username is already existed or invalid')
    username = prompt('Enter your name')
    socket.emit('CLIENT-SEND-USERNAME',username)
})
socket.on('SERVER-SEND-USERLIST',userList => {
    sessionStorage.setItem('username',username)
    const otherUsers = [...userList]
    otherUsers.splice(userList.findIndex(user => user.id === userId),1)
    otherUsers.forEach(user => {
        $('.user-list__list').append(`
            <li class="user-list__item" data-id=${user.id}>
                ${user.username}
                <i class="fas fa-phone user-list__icon"></i>
            </li>
        `)
    })
})
socket.on('NEW-USER-CONNECT',({username,id}) => {
    if($(`.user-list__item[data-id=${id}]`).length)
        return
    $('.user-list__list').append(`
        <li class="user-list__item" data-id=${id}>
            ${username}
            <i class="fas fa-phone user-list__icon"></i>
        </li>
    `)
})
socket.on('USER-DISCONNECT',id => {
    $(`.user-list__item[data-id=${id}]`).remove()
})
socket.on('CALL-USER',({signal,from}) => {
    if(peerConnect)
        socket.emit('DECLINE-CALL',from.userId)
    else {
        call = {signal,from}
        $('.call__content').text(`${from.username} is calling...`)
        $('#modalCall').modal('show')
    }
})
socket.on('DECLINE-CALL',() => {
    peerConnect = null
    alert(`User is busy`)
    $('.call__empty').text(`No Connection`)
})
$('.user-list__list ').on('click','.user-list__item',(e) => {
    if(peerConnect)
        return
    const id = $(e.target).data('id')
    $('.call__empty').text(`Calling ${$(e.target).text()}...`)
    callUser(id)
})
$('.call__accept-btn').click(e => {
    answserCall()
    $('#modalCall').modal('hide')
})
$('.call__leave-call').click(e => {
    leaveCall()
})
$('.call__decline-btn').click(e => {
    socket.emit('DECLINE-CALL',call.from.userId)
}) 
function answserCall() {
    const peer =  new SimplePeer({initiator: false, trickle: false, stream})
    peer.on('signal',data => {
        socket.emit('ANSWER-CALL',{signal : data,to : call.from.userId})
    })
    peer.on('stream',stream => {
        $('.call__empty').css('display','none')
        $('.call__leave-call').css('display','block')
        const remoteStream = document.getElementById('remoteStream')
        playStream(remoteStream,stream)
    })
    peer.on('error', (err) => console.log('error : ',err))
    peer.on('close', () => {
        window.location.reload()
    })
    peer.signal(call.signal)
    peerConnect = peer
}
function callUser(id) {
    const peer = new SimplePeer({ initiator: true, trickle: false, stream })
    peerConnect = peer
    peer.on('signal',(data) => {
        socket.emit('CALL-USER',{userToCall : id,signalData : data, from:{username,userId}})
    })
    socket.on('CALL-ACCEPT',(signal) => {
        peer.signal(signal)
    })
    peer.on('stream',stream => {
        $('.call__empty').css('display','none')
        $('.call__leave-call').css('display','block')
        const remoteStream = document.getElementById('remoteStream')
        playStream(remoteStream,stream)
    })
    peer.on('error', (err) => console.log('error : ',err))
    peer.on('close', () => {
        window.location.reload()
    })
}
function leaveCall() {
    peerConnect.destroy({err : true})
    window.location.reload()
}
function playStream(video,stream) {
    video.srcObject = stream
    video.addEventListener('loadedmetadata',function() {
        video.play()
    })
}