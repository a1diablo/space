import React from 'react';
import { connect } from 'react-redux';
import { startSendMessage, startLeaveRoom, startClearUnread, startSendingCards } from '../actions/rooms';
import Messages from './Messages';
import PeopleModal from './PeopleModal';
import database from '../firebase/firebase';
import { ipcRenderer } from 'electron';

// const getMessages = () => {

// }

// const onSubmit = (e) => {
//   e.preventDefault();

// }

export class RoomPage extends React.Component {

  state = {
    showModal: false,
    imageSrcs: {}
  }

  roomName = this.props.location.pathname.split('/').slice(-1)[0];
  sendCards = null;

  onSubmit = (e) => {
    e.preventDefault();
    const message = e.target.message.value;

    if(!message.trim()) {
      e.target.submit.diabled = true;
      return;
    }

    this.props.startSendMessage(message, this.roomName);
    e.target.reset();
  }

  handleLeaveRoom = () => {
    clearInterval(this.sendCards);
    this.props.startLeaveRoom(this.roomName);
  }

  showPeople = () => {
    this.setState({ showModal: true });
  }

  closeModal = () => {
    this.setState({ showModal: false });
  }

  componentDidMount() {
    const { desktopCapturer } = require('electron')

    desktopCapturer.getSources({ types: ['window'] }, (error, sources) => {
      if (error) throw error
      for (let i = 0; i < sources.length; ++i) {
        if (sources[i].name.includes(this.roomName)) {
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sources[i].id,
                minWidth: 1280,
                maxWidth: 2560,
                minHeight: 720,
                maxHeight: 1440
              }
            }
          }).then((stream) => this.handleStream(stream))
            .catch((e) => this.handleError(e))
          return
        }
      }
    })
  }

  handleStream(stream) {
    console.log("handle  stream")
    const video = this.refs.cards;
    video.srcObject = stream
    video.onloadedmetadata = (e) => video.play()
    this.sendCards = setInterval(() => {
      var scaleFactor = ipcRenderer.sendSync('getCurrentScaleFactor');
      console.log('scaleFactor is: ', scaleFactor);
      var canvas = document.createElement('canvas');
      canvas.width = video.width;
      canvas.height = video.height;
      var ctx = canvas.getContext('2d');
      var ratio = 2.0 / scaleFactor; // Default 200% is assumed
      var cx = video.videoWidth * ratio / 3.845 - (ratio - 1) * scaleFactor * 100; //570;
      var cy = video.videoHeight * ratio / 3.08; //400;
      var width = video.videoWidth * ratio / 10; //200;
      var height = video.videoHeight * ratio / 12; //100;
      ctx.drawImage(video, cx, cy, width, height, 0, 0, canvas.width, canvas.height);
      var image = new Image();
      image.src = canvas.toDataURL();
      //console.log(image.src);
      this.props.startSendingCards(image.src, this.roomName);
    }, 3000)

    this.startReadingCards();

    Object.entries(this.state.imageSrcs).map(([name, imgSrc]) => {
      console.log("Hello ", name);
    })
  }

  handleError(e) {
    console.log(e)
  }

  startReadingCards = () => {
    console.log('starting to read');
    database.ref(`rooms/${this.roomName}/cards`).on('child_added', (snapshot) => {
      var card_info = snapshot.val();
      console.log('reading card: ', card_info);
      database.ref(`rooms/${this.roomName}/cards/${card_info.displayName}`).on('value', (playerCards) => {
        this.state.imageSrcs[card_info.displayName] = playerCards.val().cards;
        this.setState({imageSrcs: this.state.imageSrcs});
      })
    });
  }

  // componentDidMount() {
  //   const rooms = this.props.rooms;
  //   if (rooms.length > 0) {
  //     const a = rooms.find((room) => {
  //       return room.name === this.roomName;
  //     });
  //     const roomPath = a.id;
  //     this.props.startClearUnread(roomPath, this.roomName);
  //   }
  // }

  componentDidUpdate() {
    const rooms = this.props.rooms;
    if (rooms.length > 0) {
      const a = rooms.find((room) => {
        return room.name === this.roomName;
        // const roomPath = a.id;
        // this.props.startClearUnread(this.roomName);
      });
      
    }
  }

  render() {
    return (
      <div className="box-layout--messages">
        <div className="room-header">
          <button onClick={this.showPeople} className="button--leave-room">View People</button>
          <div className="room-header__title">{this.props.location.pathname.split('/').slice(-1)[0]}</div>
          <button onClick={this.handleLeaveRoom} className="button--leave-room">Leave room</button>
        </div>
        <div style={{display: 'none'}}>
          <video id="cardvideo" width="720" height="480" ref="cards" autoPlay muted />
        </div>
        {
          Object.entries(this.state.imageSrcs).map(([name, imgSrc]) => {
            return (
              <div>
                <p style={{color: 'red'}}>{name}</p>
                <img width="200" height="100" src={imgSrc} />
              </div>
            )
          })
        }
        {/*
        <img width="200" height="100" src={this.state.imageSrc}/>
        <label width="200" height="100">This is a fucking label</label>
        */}
        <PeopleModal
          roomName={this.roomName}
          showModal={this.state.showModal}
          closeModal={this.closeModal}
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  rooms: state.rooms
});

const mapDispatchToProps = (dispatch) => ({
  startSendMessage: (message, roomName) => dispatch(startSendMessage(message, roomName)),
  startLeaveRoom: (roomName) => dispatch(startLeaveRoom(roomName)),
  startClearUnread: (roomName) => dispatch(startClearUnread(roomName)),
  startSendingCards: (cards, roomName) => dispatch(startSendingCards(cards, roomName))
});

export default connect(mapStateToProps, mapDispatchToProps)(RoomPage);