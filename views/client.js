const axios = require('axios').default;

const admin = "admin";
const password = "123456";
const postBody = { username: admin, password: password };

axios.post('http://localhost:3000/login', postBody)
    .then(function (response) {
        console.log(response.data);
    }).catch(function (error) {
        console.log(error);
    })