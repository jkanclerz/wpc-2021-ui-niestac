import {greet} from './greet';
import {awsConfig} from './aws_config';

import {
	CognitoUserPool,
	CognitoUserAttribute,
	CognitoUser,
    AuthenticationDetails,
} from 'amazon-cognito-identity-js';

import AWS from 'aws-sdk';
import {CognitoIdentityCredentials} from 'aws-sdk';

import S3 from 'aws-sdk/clients/s3';
import { uuid } from 'uuidv4';

AWS.config.region = awsConfig.Region;

const userPool = new CognitoUserPool({
    UserPoolId: awsConfig.UserPoolId,
    ClientId: awsConfig.ClientId,
})

// Authorization
const registerUser = (registerUserRequest) => {
    return new Promise((resolve, reject) => {
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
                    reject(err);
                }
                resolve(result);
            }
        );
    })
};
const confirmAccount = (confirmAccountRequest) => {
    return new Promise((resolve, reject) => {
        const user = new CognitoUser({
            Username: confirmAccountRequest.email,
            Pool: userPool
        });
    
        user.confirmRegistration(
            confirmAccountRequest.code,
            true,
            (err, result) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            }
        )
    });
};
const loginUser = (loginUserRequest) => {
    return new Promise((resolve, reject) => {
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
                resolve(result);
            },
            onFailure: (err) => {
                reject(err);
            }
        })
    })
};

const refreshAWSCredentials = (tokenData) => {
    AWS.config.credentials = new CognitoIdentityCredentials({
        IdentityPoolId: awsConfig.IdentityPoolId,
        Logins: {
            [awsConfig.credentialsLoginsKey]: tokenData
                .getIdToken()
                .getJwtToken(),
        },
    });
}

const loadLocalStorageCredentials = () => {
    return new Promise((resolve, reject) => {
        const cognitoUser = userPool.getCurrentUser();
        if (cognitoUser == null) {
            reject('user not found');
        }
    
        cognitoUser.getSession((err, session) => {
            if (err) {
                reject(err);
            }
    
            resolve(session);
        });
    })
}

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
                    const profile = attributes.reduce((aggr, item) => {
                        return {...aggr, [item.Name]: item.Value}
                    }, {});

                    resolve(profile);
                }
            });
        });
    })
};

// Storage
const listFiles = () => {
    return new Promise((resolve, reject) => {
        const s3 = new S3();
        s3.listObjectsV2({
            Bucket: awsConfig.BucketName
        }, (err, data) => {
            if (err) {
                reject(err);
            }
            console.log(data);
            resolve(data['Contents']);
        })
    })
}

const uploadToS3 = (file, userId, onProgresChange) => {
    return new Promise((resolve, reject) => {
        const s3 = new S3();
        const key = `uek-krakow/${userId}/source/${uuid()}/${file.name}`;
        
        s3.putObject({
            Key: key,
            Bucket: awsConfig.BucketName,
            Body: file
        }, (err, data) => {
            if (err) {
                reject(err);
            }

            resolve(key);
        }).on('httpUploadProgress', (progress) => {
            const currentProgress = Math.round((progress.loaded / progress.total) * 100)
            if (onProgresChange) {
                onProgresChange(currentProgress);
            }
        })
    });
}

const getPreviewUrl = (key) => {
    const s3 = new S3();
    return s3.getSignedUrl('getObject', {
        Bucket: awsConfig.BucketName,
        Key: key
    });
}

const registerUserRequest = {
    email: 'plmsvhrgdzjsukglhc@miucce.com',
    pw: '1234qwer',
    website: 'abctestit.pl',
};
const registerUserBtn = document.querySelector('.registerUser');
registerUserBtn.addEventListener('click', () => {
    registerUser(registerUserRequest)
        .then(user => {
            return user;
        })
        .then(user => console.log(user))
        .catch(err => console.log(err))
    ;
});
const confirmAccountBtn = document.querySelector('.confirmAccount');
confirmAccountBtn.addEventListener('click', () => {
    confirmAccount({
        email: registerUserRequest.email,
        code: '506075'
    })
        .then(user => console.log(user))
        .catch(err => console.log(err));
});
const loginUserBtn = document.querySelector('.loginUser');
loginUserBtn.addEventListener('click', () => {
    loginUser({
        email: registerUserRequest.email,
        pw: registerUserRequest.pw,
    })
        .then(tokenData => refreshAWSCredentials(tokenData))
        .catch(err => console.log(err));
});

const listFilesBtn = document.querySelector('.listFiles');
listFilesBtn.addEventListener('click', () => {
    listFiles()
        .then(files => files.map(file => file.Key))
        .then(names => console.log(names))
        .catch(err => console.log(err))
    ;
});

const uploadFilesBtn = document.querySelector('.uploadFiles .uploadFiles__button');
uploadFilesBtn.addEventListener('click', () => {
    const filesInput = document.querySelector('.uploadFiles .uploadFiles__input');
    const toBeUploaded = [...filesInput.files];
    const progressBar = document.querySelector('.uploadFiles .progressBar__bar');
    if (toBeUploaded.length == 0) {
        console.log('not enough files selected');
        return;
    }
    const userId = AWS.config.credentials.identityId;

    toBeUploaded.forEach(file => {
        uploadToS3(
            file,
            userId,
            (currentProgress) => {
                progressBar.style.width = `${currentProgress}%`;
                progressBar.textContent = `uploading ... ${currentProgress} %`;
            }
        )
            .then(key => {
                console.log(`yeah it works, your file key ${key}`);
                return key;
            })
            .then(key => getPreviewUrl(key))
            .then(url => console.log(url))
            .catch(err => {
                console.log(err);
                console.log('sht is not YESS!!! :>')
            });
    });
});

(() => {
    loadLocalStorageCredentials()
        .then(tokenData => refreshAWSCredentials(tokenData))
        .catch(err => console.log("can't refresh credentials exception"))
    ;

    getCurrentUser()
        .then(profile => {
            greet(`${profile.email} nice website ${profile.website}`);
        })
        .catch(err => greet('Guest ;>'))
    
})();