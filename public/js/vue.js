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

        responses: {},
        name: '',
        email: '',

        searchInput: '',
        searchResult: [],
        queue: {}
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
        displayUser: function () {
            this.name = this.responses.user.display_name;
            this.email = this.responses.user.email;
        },
        displayNewToken: function () {
            this.refresh_token = this.responses.refreshToken;
        },
        displaySearch: function () {
            var i;
            var len = this.responses.search.tracks.total;
            for (i = 0; i < len; i++) {
                this.searchResult[i] = {
                    track: this.responses.search.tracks.items[i].name,
                    artist: this.responses.search.tracks.items[i].artists.join(", "),
                    cover: this.responses.search.tracks.items[i].album.images[0].url
                }
            }
            console.log(this.searchResult);
        }
    }
});