let nam = document.getElementById('name')
let emai = document.getElementById('email')
let dateOfBirt = document.getElementById('dateof')
let passwor = document.getElementById('password')
let confirmpas = document.getElementById('confirmpass')
let sbtn = document.getElementById('sbtn')

let title = document.getElementById('title')
let desc = document.getElementById('desc')
let okbtn = document.getElementById('okbtn')
let popup = document.getElementById('popup')
let popupbox = document.getElementById('popup-box')

let loader = document.querySelector('.anim')

sbtn.addEventListener('click', signup)
okbtn.addEventListener('click', hideModal)

// show loader
function displayLoading() {
    loader.classList.add('display');
    // to stop loading after sometime
    setTimeout(() => {
        loader.classList.remove('display');
    }, 10000);
}

// hide loader
function hideLoading() {
    loader.classList.remove('display');
}

// Show success model
function displayModal() {
    popupbox.classList.add('display');
    popup.classList.add('display');
}

// Hide success model
function hideModal() {
    popupbox.classList.remove('display');
    popup.classList.remove('display');
}


function signup() {
    displayLoading()
    let name = nam.value;
    let email = emai.value;
    let dateOfBir = dateOfBirt.value;
    let password = passwor.value;
    let confirmpass = confirmpas.value;

    if (name == "" || email == "" || password == "" || dateOfBir == "" || confirmpass == "") {
        hideLoading()
        title.innerText = "Error!"
        desc.innerText = "Input fields are empty"
        okbtn.innerText = "Alright"
        displayModal()
    } else if (!(password == confirmpass)) {
        hideLoading()
        title.innerText = "Warning!"
        desc.innerText = "Passwords does not match"
        okbtn.innerText = "Alright"
        displayModal()
    } else {
        function save() {
            displayLoading()
            fetch('http://localhost:27017/user/signup', {
                method: 'POST',
                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password,
                    dateOfBirt: dateOfBir
                }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                },
            })
            .then(response => response.json())
            .then(data => {
                title.innerText = "Signup Successful!"
                desc.innerText = "A link has been sent to your email to verify your account"
                okbtn.innerText = "Great!"
                displayModal()
                hideLoading()
            })
        }

        save();

        nam.value = '';
        emai.value = '';
        passwor.value = '';
        confirmpas.value = '';
    }
}