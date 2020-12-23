# Submission for d3hiring assessment (Teacher API)

This simple Node app was created by **DAO Trung Hieu** <trung.hieu.dao@gmail.com> for the d3hiring assessment.

The assessment text can be found at [docs/dev-assessment.md](docs/dev-assessment.md).

## Hosted Version

A temporary live version of the API exists - the connection information is in the submission email.

The API is not protected by some key, like a `x-api-key` header. In a proper deployment access should be protected through a key system.

## Installation & Running

### Pre-Requisites

To run this app, the system has to have the following installed and setup:
- MySQL
- Node and npm

### Install & Run

1. Run `npm install` in the root folder of the project to install all dependencies.
2. Rename `.env.example` to `.env` and adjust the information inside.
3. Ensure that the databases named in `.env` exist before starting.
4. Run the app:
    - `npm start` to start the app.
    - `npm test` to run the tests. The integration tests require access to a test database.

### Configuration

Configure the app by renaming `.env.example` to `.env` and editing the information inside.
By default, the app will listen to `127.0.0.1:3000`.

Ensure that the databases exist before starting the app or running the tests. Do note, that the database for testing will be cleared of any tables and content during testing.

## Assumptions

I made assumptions and implemented reasonable behaviours whenever the user stories don't specify details.

- All email addresses are case-insensitive, but no padding with whitespaces is allowed.

### `POST /api/register`

- Teacher and Students are created if they don't exist.
- A Teacher can appear as Students to other Teachers.
- Response status is 400 when there were issues with the arguments.

### `GET /api/commonstudents`

- All Teachers in the query must exist, or it will return Error 404.

### `POST /api/suspend`

- The Student must exist to be suspended, or it will return Error 404.

### `POST /api/retrievefornotifications`

- The Teacher must exist, or it will return Error 404.
- Mentioned Students that do not exist are ignored.

## Restrictions

The app was made in relatively short time and in limited scope for this assessment. I did not implement or test certain things in order to limit the used time:

- The application does not defend against malicious attacks of any kind beyond basic input sanitation and validation.
- The API does not have any access restrictions (speed, quota, access key).
