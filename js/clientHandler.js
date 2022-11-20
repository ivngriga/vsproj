
// Main Stuff
var body = document.getElementsByTagName("body")[0];
var connectButton = document.getElementById('connectButton');
var radios = document.getElementsByName("amount");
var walletInput = document.getElementById('walletInput');

// Settings Stuff
var walletDisplay = document.getElementById('walletDisplay');
var settingsDisplay = document.getElementById('settings');
var settingsButton = document.getElementById('settingsButton');
var disconnectButton = document.getElementById('disconnectWalletButton');

// Chat Stuff
var chatInput = document.getElementById('chatInput');
var chatDisplay = document.getElementById('chat');
var messageDisplay = document.getElementById('messageDisplay');
var messageButton = document.getElementById('messageButton');

// Rematch Stuff
var rematchDisplay = document.getElementById('rematch');
var rematchAmount = document.getElementById('rematchAmount');
var rematchButton = document.getElementById('rematchButton');
var showRematchButton = document.getElementById('showRematch');

// Hide optional windows
showRematchButton.style.display = "none";
chatDisplay.style.display = "none";
settingsDisplay.style.display = "none";
rematchDisplay.style.display = "none"

// Set button functions
showRematchButton.onclick=showRematch;
settingsButton.onclick=showSettings;
disconnectButton.onclick=disconnectWallet;
messageButton.onclick=sendMessage;
rematchButton.onclick=sendRematch;

// Declare audio shit
var audioelement;

audioelement = document.createElement('audio');  
document.body.appendChild(audioelement)           
window.localAudio = audioelement;

audioelement = document.createElement('audio');  
document.body.appendChild(audioelement)           
window.remoteAudio = audioelement;

// Declere variables
var microphone;
var peerConn;
var selectAmount;
var socket;
var call;
var peer;
var clientState="inactive";
var ingame=false;
var displayDisconnect = true;

// Get Cookie Info
var cookies=convert_cookies(document.cookie);
var wallet=cookies['wallet'];

// connect socket and pass selected bet amount
if(wallet!=undefined){
    walletInput.style.display = "none";
    console.log("Connected: "+wallet);

    // Init new socket
    socket = io({
        query: {
            "wallet": wallet,
        }
    });

    

    getLocalStream();
    startListening();

    connectButton.onclick = startSearch;
} else {
    walletInput.style.display = "block";
    connectButton.innerHTML="Connect Wallet";
    connectButton.onclick = connectWallet;
    
}

function convert_cookies(cookies){
    str = cookies.split('; ');
    const result = {};
    for (let i in str) {
        const cur = str[i].split(': ');
        result[cur[0]] = cur[1];
    }
    return result;
}

//addMessage("Hey Retard!", 1);
//addMessage("Hey Retard!", 2);

addEventListener('keypress', (event) => {
    var kc = event.key;
    if(kc=='Enter' && !event.shiftKey){
        sendMessage();
        event.preventDefault();
    }
});

function getLocalStream() {
    navigator.mediaDevices.getUserMedia({video: false, audio: true}).then((stream) => {
        window.localStream = stream; // A
        window.localAudio.srcObject = stream; // B
        stream.getAudioTracks()[0].enabled = false;

        addEventListener('keydown', (event) => {
            var kc = event.key;
            if(kc=='k'){
                stream.getAudioTracks()[0].enabled = true;
                event.preventDefault();
            }
        });

        addEventListener('keyup', (event) => {
            var kc = event.key;
            if(kc=='k'){
                stream.getAudioTracks()[0].enabled = false;
                event.preventDefault();
            }
        });

        microphone=true;
        socket.emit("microphone_enabled");
        //window.localAudio.autoplay = true; // C
    }).catch((err) => {
        microphone=false;
        socket.emit("microphone_disabled");
    });
}

function sendMessage(){
    let text=chatInput.value;
    let temp=text.replace(" ","");
    temp=temp.replace("\n", "");

    if(temp.length>0){
        chatInput.value="";
        addMessage(1, text);
    }
}

function addMessage(type, msg){
    var node=document.createElement("div");
    let part1="";
    let part2=msg;
    let acceptButton=false;
    let declineButton=false;
    
    if(type==1){
        // Message from us
        part1="You: ";
        socket.emit("send_message", msg);

    } else if (type==2){
        // Message from stranger
        part1="Stranger: ";
        
    } else if (type==3) {
        // Stranger disconnected
        part2="Opponent Disconnected!";
    } else if (type==4){
        // Stranger reconnected
        part2="Opponent Reconnected!";
    } else if (type==5) {
        // You offered rematch
        part2="You offered a rematch for: "+msg+" SOL. ";
    } else if (type==6){
        // Stranger offered rematch
        part2="Stranger offered rematch for: "+msg+" SOL.";

        acceptButton = document.createElement('button');
        declineButton = document.createElement('button');

        acceptButton.innerHTML="Accept";
        declineButton.innerHTML="Decline";

        acceptButton.classList.add("rematch-button");
        declineButton.classList.add("rematch-button");

        acceptButton.addEventListener('click', () => {
            socket.emit("accept_rematch", msg);
            acceptButton.remove();
            declineButton.remove();
        });
        declineButton.addEventListener('click', () => {
            socket.emit("decline_rematch");
            acceptButton.remove();
            declineButton.remove();
            
        });
        
    } else if(type==7){
        // Rematch declined
        part2="Your rematch offer was declined.";
    } else if(type==8){
        // Rematch Accepted
        part2="Your rematch offer was accepted!";
    } else if (type==9){
        // You won
        part2="You won " +msg+" SOL!";
    } else if (type==10){
        // You lost
        part2="You lost "+msg+" SOL...";
    } else if (type==11){
        part2="Voice chat connected: hold K to speak!";
    } else if (type==12){
        part2="One of the users disabled microphone. Voice chat unavailable."
    }
    node.innerHTML=part1+part2;

    messageDisplay.appendChild(node);

    if(acceptButton!=false && declineButton!=false){
        messageDisplay.appendChild(acceptButton);
        messageDisplay.appendChild(declineButton);
    }

    
}

function disconnectWallet() {
    console.log("Wallet Disconnected!");
    document.cookie = "wallet: ; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost";

    walletInput.style.display = "block";
    connectButton.innerHTML="Connect Wallet";
    connectButton.onclick = connectWallet;

    cookies=convert_cookies(document.cookie);
    wallet=cookies['wallet'];

    if(socket){
        socket.disconnect();
        socket=false;
    }

    showSettings();
    showSettings();
}

function showRematch() { 
    if(rematchDisplay.style.display == "none"){
        rematchDisplay.style.display = "block"
    } else {
        rematchDisplay.style.display = "none"
    }
}

function showSettings() {
    if(wallet!=undefined){
        walletDisplay.innerHTML=wallet;
        if(settingsDisplay.style.display == "none"){
            settingsDisplay.style.display = "block";

            disconnectButton.style.display = "none";
            if(displayDisconnect==true){
                disconnectButton.style.display = "block";
            }
        } else {
            settingsDisplay.style.display = "none";
        }
    } else {
        walletDisplay.innerHTML="No Wallet Connected!";
        disconnectButton.style.display = "none";
        if(settingsDisplay.style.display == "none"){
            settingsDisplay.style.display = "block";
        } else {
            settingsDisplay.style.display = "none";
        }
    }
    
    
}

function sendRematch(){
    let rAmountSelected=rematchAmount.value;

    if(rAmountSelected>0){
        socket.emit("rematch_offer", rAmountSelected);
        addMessage(5, rAmountSelected);
        showRematch();
        showRematchButton.style.display="none";
    }
    
}

function connectWallet() {
    displayDisconnect=true;
    wallet = walletInput.value;

    document.cookie="wallet: "+wallet+"; path=/;";

    // change search button
    connectButton.innerHTML="Start Search";
    connectButton.onclick = startSearch;
    connectButton.disabled = false;

    cookies=convert_cookies(document.cookie);
    wallet=cookies['wallet'];

    socket = io({
        query: {
            "wallet": wallet
        }
    });

    walletInput.style.display = "none";

    startListening();

    showSettings();
    showSettings();
}

function startSearch () {
    getLocalStream()

    messageDisplay.innerHTML="";

    displayDisconnect=false;

    chatDisplay.style.display = "none";

    showRematchButton.style.display = "none";
    rematchDisplay.style.display = "none";

    // get the amount selected
    selectAmount = document.querySelector('input[name="amount"]:checked').value;

    // disable amount selector
    for (var i=0, iLen=radios.length; i<iLen; i++) {
        radios[i].disabled = true;
    }

    socket.emit("start_search", selectAmount);
    console.log("Game search began: "+wallet); // x8WIv7-mJelg7on_ALbx

    // change search button
    connectButton.innerHTML="Cancel Search";
    connectButton.onclick = cancelSearch;
    connectButton.disabled = false;

    // change client state
    clientState="searching";

    showSettings();
    showSettings();
}

function cancelSearch(resetui) {
    displayDisconnect = true;

    showSettings();
    showSettings();
    // check if we just want to reset the ui
    if(resetui!=true){
        // disconnect socket
        console.log("You Cancelled Search");
        socket.emit("disconnect_user");
    } else {
        console.log("Game Ended!");
    }

    // re enable radio
    for (var i=0, iLen=radios.length; i<iLen; i++) {
        radios[i].disabled = false;
    } 
    
    // change search button
    connectButton.innerHTML="Start Search";
    connectButton.onclick = startSearch;
    connectButton.disabled = false;

    // change client state
    clientState="inactive";
}

// notify when game was found
function startListening(){
    if(socket){
        socket.on("create_peer", () => {
            // Init new peer
            peer = new Peer(wallet, {
                host: 'localhost',
                port: 9000,
                path: '/peerserver',
            })

            peer.on('open', function(id) {
                console.log('My peer ID is: ' + id);
              
            });

            peer.on('connection', function(connection){
                peerConn=connection;
                
                peerConn.on("open", () => {
                    peer.on('call', (incoming) => {
                        if(incoming._eventsCount==0){
                            incoming.answer(window.localStream);
        
                            incoming.on("stream", (stream) => {
                                window.remoteAudio.srcObject = stream;
                                window.remoteAudio.autoplay = true;
                                window.peerStream = stream;

                                addMessage(11);
                                console.log("Connecting to: "+ incoming.peer);
                            });
            
                            call=incoming;
                        }
                    });

                    peerConn.on("data", (data)=>{
                        if(data=="vc_unavailable"){
                            addMessage(12);
                        }
                    });
                })
            });

            peer.on("error", (err)=>{
                console.log(err);
            });
        });

        socket.on("peer_exists", () => {
            console.log("Game is open in another tab!");
            
            body.textContent = 'You are logged in in another window!';
        });
        

        socket.on("connected_to_user", (peerid, peerMicrophone) => {
            getLocalStream()
            
            showRematchButton.style.display = "none";
            rematchDisplay.style.display = "none";

            displayDisconnect=false;
            console.log("You are now connected to another user!"); // x8WIv7-mJelg7on_ALbx
        
            connectButton.innerHTML="Game Found";
            connectButton.disabled = true;

            chatDisplay.style.display = "block";

            ingame=true;

            if(peerid!=-1 && peer){
                connectAudio(peerid, peerMicrophone);
            }
        });
        
        // display whether or not you won
        socket.on("notify_results", (winner, amount) => {
            if(winner==1){
                addMessage(9, amount); // x8WIv7-mJelg7on_ALbx
            } else {
                addMessage(10, amount); // x8WIv7-mJelg7on_ALbx
            }
            
            showRematchButton.style.display = "block";
            ingame=false;
            // change search button
            connectButton.innerHTML="Start New Search";
            connectButton.onclick = startSearch;
            connectButton.disabled = false;

            for (var i=0, iLen=radios.length; i<iLen; i++) {
                radios[i].disabled = false;
            } 
        });
        
        socket.on("you_reconnected", (peerid, peerMicrophone) => {
            console.log("You Reconnected!");
            chatDisplay.style.display = "block";
            connectButton.innerHTML="Game Found";
            connectButton.disabled = true;

            ingame=true;

            connectAudio(peerid, peerMicrophone);
        });
        
        socket.on("opponent_reconnected", () => {
            console.log("Opponent Reconnected!");

            

            addMessage(4);
        });
        
        socket.on("opponent_disconnected", () => {
            console.log("Opponent Disconnected!");
            addMessage(3);

            if(call){
                call.close();
                call=undefined;
            }

            if(peerConn){
                peerConn.close();
                peerConn=undefined;
            }

            // If game ended, hide rematch stuff
            if(ingame==false){
                showRematchButton.style.display = "none";
                rematchDisplay.style.display = "none";
                let rematchButtons = document.getElementsByClassName("rematch-button");

                // If rematchbuttons were created, delete them
                if(rematchButtons && rematchButtons.length > 0){
                    while(rematchButtons[0]) {
                        rematchButtons[0].parentNode.removeChild(rematchButtons[0]);
                    }

                }
            }
        });
        
        // reset button after disconnect
        socket.on("disconnect", () => {
            if(wallet!=undefined){
                cancelSearch(resetui=true);
            }
        });

        socket.on("receive_message", (msg) => {
            addMessage(2,msg);
        });

        socket.on("rematch_offered", (amount) => {
            addMessage(6,amount);
        });

        socket.on("rematch_accepted", () => {
            addMessage(8);
        });

        socket.on("rematch_declined", () => {
            addMessage(7);
            showRematchButton.style.display="block";
        });
    }
}

function connectAudio(peerid, peerMicrophone){
    peerConn = peer.connect(peerid)

    peerConn.on("open", ()=>{
        if(microphone&&peerMicrophone){
            setTimeout(function temp() {
                try {
                    getLocalStream();

                    call = peer.call(peerid, window.localStream);

                    call.on("stream", (stream)=>{
                        window.remoteAudio.srcObject = stream;
                        window.remoteAudio.autoplay = true;
                        window.peerStream = stream;

                        addMessage(11);
                        console.log("Connecting to: "+ peerid);
                    });
    
                    call.on("error", function (err) {
                        console.error(err);
                    });
                } catch (error) {
                    setTimeout(temp, 20);
                }
            }, 10);
        } else {
            addMessage(12);
            peerConn.send("vc_unavailable");
        }
    });
}