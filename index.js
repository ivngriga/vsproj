'use strict';

const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const http = require('http');

const server = http.createServer(app);

var io = require('socket.io')(server);

app.use("/js", express.static('./js/'));

server.listen(3000, () => {
  console.log('socket.io listening on *:3000');
});

const { PeerServer } = require('peer');

const peerServer = PeerServer({ port: 9000, path: '/peerserver', allow_discovery: true});


var users={},
  selectedBet=-1,
  queue={};

function endGame(wallet1, wallet2, amount){
  // End Game - Disconnect both sockets + notify results + reset users

  // Generate random number (0/1)
  var winner=Math.round(Math.random());

  if(users[wallet1].connected){
    users[wallet1].socket.emit("notify_results", winner==0, amount);
  }

  if(users[wallet2].connected){
    users[wallet2].socket.emit("notify_results", winner==1, amount);
  }

  users[wallet1].ingame=false;
  users[wallet2].ingame=false;

  //users[wallet1].connectedTo=-1;
  //users[wallet2].connectedTo=-1;

  console.log("Game Ended: "+wallet1+" vs "+wallet2+". Amount Bet: "+amount);
}

io.sockets.on("connection", (socket) => {
    // get amopunt user selected + get wallet
    
    var amountSelected=socket.handshake.query.amount;
    var userWallet=socket.handshake.query.wallet;

    if(users[userWallet] && users[userWallet].connected==true){
      socket.emit("peer_exists");
      console.log(userWallet + " attempted to connect. He has already opened.");
    } else {
      console.log("User Connected: "+userWallet);

      socket.emit("create_peer");

    
      // iF we already exist and changed sockets, update the socket in users
      if(users[userWallet]){
        users[userWallet].socket=socket;
        users[userWallet].connected=true;
      } else {
        // Create new entry in users
        users[userWallet] = {
          socket: socket,
          connectedTo: -1,
          amount: undefined,
          ingame: false,
          connected: true,
          microphone: false
        };
      }

      // Check if we are in game and reconnect if true
      if(users[userWallet].ingame == true){
        var connectedTo=users[userWallet].connectedTo;
        users[userWallet].connected=true;


        socket.emit("you_reconnected", connectedTo, users[connectedTo].microphone);
        if(users[connectedTo].connected){
          users[connectedTo].socket.emit("opponent_reconnected");
        }
      } 
      
      socket.on("start_search", (amountSelected) => {
        // If connected to another user, notify them and disconnect them
        if(users[userWallet].connectedTo!=-1){
          users[users[userWallet].connectedTo].socket.emit("opponent_disconnected");
          users[users[userWallet].connectedTo].connectedTo=-1;
        }

        users[userWallet].connectedTo=-1;
        
        selectedBet=amountSelected;

        console.log("User Searching: "+userWallet);
        // If there is a person in queue with our bet
        if(queue[selectedBet]){
          // If there is person in queue for this amount connect the two
          var connWallet=queue[selectedBet]

          // connect our info
          users[userWallet].connectedTo = connWallet;
          users[userWallet].ingame=true;

          // connect other's info
          users[connWallet].connectedTo = userWallet;
          users[connWallet].ingame=true;
          
          // start and finish game
          // startGame();
          setTimeout(endGame, 10000, userWallet, users[userWallet].connectedTo, selectedBet);

          console.log("Game Found: "+userWallet+" vs "+connWallet);
          
          // notify user that they are connected
          socket.emit("connected_to_user",connWallet,users[connWallet].microphone);
          users[connWallet].socket.emit("connected_to_user", -1);
          
          // delete the other from queue
          delete queue[selectedBet];
        } else {
          // If there are no people in queue for this amount add person to queue
          queue[selectedBet] = userWallet;
        }
      });

      // a user canceled search
      socket.on("disconnect_user", () => {
        if(queue[selectedBet]==userWallet){
          // if person is in queue, delete socket from queue
          delete queue[selectedBet];
          console.log("User stopped searching: "+userWallet);
        }
        
      });

      socket.on('disconnect', () => {
        if(queue[selectedBet]==userWallet){
          // if person is in queue, delete socket from queue
          delete queue[selectedBet];
          console.log("User stopped searching: "+userWallet);
        }

        users[userWallet].connected=false;

        let opponentWallet=users[userWallet].connectedTo;
          
        
        if(users[opponentWallet]){
          if(users[opponentWallet].connected){
            users[opponentWallet].socket.emit("opponent_disconnected");
          }

          if(users[opponentWallet].ingame==false){
            users[opponentWallet].connectedTo=-1;
          }

          if(users[userWallet].ingame==false){
            users[userWallet].connectedTo=-1;
          }
        } 
        
        
          
        
        console.log('User Disconnected: '+ userWallet);
      });

      socket.on('send_message', (msg) => {
        console.log("User sent message!");
        let opponentWallet=users[userWallet].connectedTo;
        if(opponentWallet!=-1 && users[opponentWallet].connected==true){
          users[opponentWallet].socket.emit("receive_message", msg);
        }
      });

      socket.on('rematch_offer', (amount) => {
        console.log("User sent rematch offer!");
        let opponentWallet=users[userWallet].connectedTo;
        if(opponentWallet!=-1 && users[opponentWallet].connected==true){
          users[opponentWallet].socket.emit("rematch_offered", amount);
        }
      });

      socket.on('accept_rematch', (amount) => {
        console.log("Rematch offer accepted! ");
        let opponentWallet=users[userWallet].connectedTo;

        users[userWallet].ingame=true;
        users[opponentWallet].ingame=true;

        setTimeout(endGame, 10000, userWallet, opponentWallet, amount);

        console.log("Rematch: "+userWallet+" vs "+opponentWallet);

          // notify user that they are connected
        socket.emit("connected_to_user");
        users[opponentWallet].socket.emit("connected_to_user");

        users[opponentWallet].socket.emit("rematch_accepted");
      });

      socket.on('decline_rematch', () => {
        let opponentWallet=users[userWallet].connectedTo;

        if(users[opponentWallet].connected==true){
          users[opponentWallet].socket.emit("rematch_declined");
        }

        console.log("Rematch Declined");
        
      });

      socket.on('microphone_enabled', ()=>{
        users[userWallet].microphone=true;
      });

      socket.on('microphone_disabled', ()=>{
        users[userWallet].microphone=false;
      });
  }
});

