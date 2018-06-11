'use strict';
var socket = io();

var vm = new Vue({
    el: '.container',
    data: {
        params: {},
        access_token: '',
        refresh_token: '',
        error: '',
        login: true,
        showQueue: true,
        showUserInfo: false,
        playing: false,

        responses: {},
        name: '',
        email: '',

        currentSong: '',
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
                    $.ajax({
                        url: 'https://api.spotify.com/v1/me',
                        headers: {
                            'Authorization': 'Bearer ' + this.access_token
                        },
                        success: function (response) {
                            Vue.set(vm.responses, 'user', response);
                            vm.displayUser();
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
        play: function () {
            $.ajax({
                url: 'https://api.spotify.com/v1/me/player/play',
                headers: {
                    'Authorization': 'Bearer ' + this.access_token
                },
                success: function (response) {
                    console.log(response);
                }
            });
            this.playing = true;
        },
        pause: function () {
            $.ajax({
                url: 'https://api.spotify.com/v1/me/player/pause',
                headers: {
                    'Authorization': 'Bearer ' + this.access_token
                },
                success: function (response) {
                    console.log(response);
                }
            });
            this.playing = false;
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
            if (this.queue.length === 0 && this.currentSong === '') {
                this.currentSong = song;
            } else {
                this.queue.push(song);
            }
            this.searchInput = "";
            this.showQueue = true;
        },
        displayUser: function () {
            this.name = this.responses.user.display_name;
            this.email = this.responses.user.email;
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
                        cover: this.responses.search.tracks.items[i].album.images[0].url
                    }
                }
            }
            this.oldSearchInput = this.searchInput;
        },
    }
});