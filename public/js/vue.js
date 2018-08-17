'use strict';
var socket = io();

var vm = new Vue({
    el: '.background',
    data: {
        params: {},
        user_id: '',
        queue_id: '',
        access_token: '',
        refresh_token: '',
        error: '',
        login: true,
        contribute: false,
        showQueue: true,
        playing: false,
        songHasStarted: false,
        backgroundImage: '/img/bgTransparent.png',

        responses: {},
        name: '',
        email: '',

        searchInput: '',
        oldSearchInput: '',
        searchResult: [],
        queue: []
    },
    created: function () {
        this.params = this.getParams();

        this.access_token = this.params.access_token;
        this.refresh_token = this.params.refresh_token;
        this.error = this.params.error;

        if (this.access_token) this.login = false;
        else this.login = true;

        this.authenticate();
        this.newPlaylist();

        socket.on('initialize', function (data) {
            this.queue = data.queue;
        }.bind(this));

        socket.on('songAdded', function (queue) {
            this.queue = queue;
        }.bind(this));
    },
    methods: {
        getParams: function () {
            var hashParams = {};
            var e, r = /([^&;=]+)=?([^&;]*)/g,
                q = window.location.hash.substring(1);
            while (e = r.exec(q)) {
                hashParams[e[1]] = decodeURIComponent(e[2]);
            }
            return hashParams;
        },
        authenticate: function () {
            if (this.error) {
                alert('There was an error during the authentication');
            } else {
                if (this.access_token) {
                    this.login = false;
                    this.backgroundImage = '/img/1bw.jpg';
                    $.ajax({
                        url: 'https://api.spotify.com/v1/me',
                        headers: {
                            'Authorization': 'Bearer ' + this.access_token
                        },
                        success: function (response) {
                            Vue.set(vm.responses, 'user', response);
                            vm.displayUser();
                            vm.newPlaylist(); // ONLY IF PLAYLIST METHOD IS USED
                        }
                    });
                } else {
                    this.login = true;
                }
            }
        },
        newToken: function () {
            $.ajax({
                url: '/refresh_token',
                data: {
                    'refresh_token': this.refresh_token
                }
            }).done(function (data) {
                Vue.set(vm.responses, 'refreshToken', data.access_token);
                vm.displayNewToken();
            });
        },
        join: function () {
            this.contribute = true;
            this.backgroundImage = '/img/1bw.jpg';
        },
        notifyOthers: function () {
            socket.emit('songAdded', this.queue);
        },
        newPlaylist: function () {
            $.ajax({
                url: 'https://api.spotify.com/v1/users/' + this.user_id + '/playlists',
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + this.access_token,
                    'Content-Type': 'application/json'
                },
                data: "{\"name\":\"Music Queue\",\"description\":\"Your collaborative queue\"}",
                success: function (response) {
                    Vue.set(vm.responses, 'playlist', response);
                    vm.setQueueId();
                }
            });
        },
        addToPlaylist: function (song) {
            $.ajax({
                url: 'https://api.spotify.com/v1/users/' + this.user_id + '/playlists/' + this.queue_id + '/tracks',
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + this.access_token,
                    'Content-Type': 'application/json'
                },
                data: "{\"uris\": [\"spotify:track:" + song.id + "\"]}",
                success: function (response) {
                }
            });
        },
        play: function () {
            this.getPlayback();
            if (this.songHasStarted) {
                $.ajax({
                    url: 'https://api.spotify.com/v1/me/player/play',
                    method: 'PUT',
                    headers: {
                        'Authorization': 'Bearer ' + this.access_token
                    },
                    success: function (response) {
                    }
                });
            } else {
                this.playQueue();
            }
            this.playing = true;
        },
        pause: function () {
            $.ajax({
                url: 'https://api.spotify.com/v1/me/player/pause',
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + this.access_token
                },
                success: function (response) {
                }
            });
            this.playing = false;
        },
        playQueue: function () {
            $.ajax({
                url: 'https://api.spotify.com/v1/me/player/play',
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + this.access_token,
                    'Content-Type': 'application/json'
                },
                data: "{\"context_uri\":\"spotify:user:" + this.user_id + ":playlist:" + this.queue_id + "\",\"offset\":{\"position\":0}}",
            });
        },
        getPlayback: function () {
            $.ajax({
                url: 'https://api.spotify.com/v1/me/player',
                headers: {
                    'Authorization': 'Bearer ' + this.access_token,
                },
                success: function (response) {
                    Vue.set(vm.responses, 'player', response);
                    vm.setSongHasStarted();
                }
            });
        },
        search: function (query) {
            $.ajax({
                url: 'https://api.spotify.com/v1/search',
                headers: {
                    'Authorization': 'Bearer ' + this.access_token
                },
                data: {
                    q: query,
                    type: 'track'
                },
                success: function (response) {
                    Vue.set(vm.responses, 'search', response);
                    vm.displaySearch();
                }
            });
        },
        queueSong: function (song) {
            this.queue.push(song);
            this.backgroundImage = this.queue[0].cover;
            this.addToPlaylist(song);
            this.searchInput = "";
            this.showQueue = true;
            this.notifyOthers();
        },
        displayUser: function () {
            this.name = this.responses.user.display_name;
            this.email = this.responses.user.email;
            this.user_id = this.responses.user.id;
        },
        displayNewToken: function () {
            this.refresh_token = this.responses.refreshToken;
        },
        displaySearch: function () {
            this.showQueue = false;
            var i;
            var len = this.responses.search.tracks.total;
            if (this.responses.search) {
                for (i = 0; i < len; i++) {
                    this.searchResult[i] = {
                        track: this.responses.search.tracks.items[i].name,
                        artist: this.responses.search.tracks.items[i].artists[0].name,
                        cover: this.responses.search.tracks.items[i].album.images[0].url,
                        id: this.responses.search.tracks.items[i].id
                    }
                }
            }
            this.oldSearchInput = this.searchInput;
        },
        setQueueId: function () {
            this.queue_id = this.responses.playlist.id;
        },
        finished: function () {
            //if (this.responses.player.progress_ms >= this.responses.player.item.)face
        },
        isPlaying: function () {
            return this.responses.player.is_playing;
        },
        setSongHasStarted: function () {
            if (this.responses.player.progress_ms > 0) {
                this.songHasStarted = true;
            } else {
                this.songHasStarted = false;
            }
        }
    }
});