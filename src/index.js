import {greet} from './greet';
import {awsConfig} from './aws_config';

import {
	CognitoUserPool,
	CognitoUserAttribute,
	CognitoUser,
    AuthenticationDetails,
} from 'amazon-cognito-identity-js';

const userPool = new CognitoUserPool({
    UserPoolId: awsConfig.UserPoolId,
    ClientId: awsConfig.ClientId,
})

const registerUser = (registerUserRequest) => {
    userPool.signUp(
        registerUserRequest.email,
        registerUserRequest.pw,
        [
            new CognitoUserAttribute({
                Name: 'website',
                Value: registerUserRequest.website,
            })
        ],
        null,
        (err, result) => {
            if (err) {
                console.log(err);
                return;
            }

            console.log(result);
        }
    );
};
const confirmAccount = (confirmAccountRequest) => {
    const user = new CognitoUser({
        Username: confirmAccountRequest.email,
        Pool: userPool
    });

    user.confirmRegistration(
        confirmAccountRequest.code,
        true,
        (err, result) => {
            if (err) {
                console.log(err);
                return;
            }

            console.log(result);
        }
    )
};
const loginUser = (loginUserRequest) => {
    const authDetails = new AuthenticationDetails({
        Username: loginUserRequest.email,
        Password: loginUserRequest.pw
    });
    const user = new CognitoUser({
        Username: loginUserRequest.email,
        Pool: userPool,
    });
    user.authenticateUser(authDetails, {
        onSuccess: (result) => {
            console.log(result);
        },
        onFailure: (err) => {
            console.log(err);
        }
    })
};
const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
        const cognitoUser = userPool.getCurrentUser();
        if (cognitoUser == null) {
            reject('user not found');
        }
    
        cognitoUser.getSession((err, session) => {
            if (err) {
                reject(err);
            }
    
            cognitoUser.getUserAttributes((err, attributes) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(attributes);
                }
            });
        });
    })
};


const registerUserRequest = {
    email: 'zmh90824@eoopy.com',
    pw: '1234qwer',
    website: 'jkan.pl',
};

const registerUserBtn = document.querySelector('.registerUser');
registerUserBtn.addEventListener('click', () => {
    registerUser(registerUserRequest);
});

const confirmAccountBtn = document.querySelector('.confirmAccount');
confirmAccountBtn.addEventListener('click', () => {
    confirmAccount({
        email: registerUserRequest.email,
        code: '197292'
    })
});

const loginUserBtn = document.querySelector('.loginUser');
loginUserBtn.addEventListener('click', () => {
    loginUser({
        email: registerUserRequest.email,
        pw: registerUserRequest.pw,
    })
});


(() => {
    getCurrentUser()
        .then(profile => {
            console.log(profile);
            greet('Kuba ;>');
        })
        .catch(err => greet('Guest ;>'))
    
})();