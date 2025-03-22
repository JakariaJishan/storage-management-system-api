# Storage Management System

This project is a storage management system that allows users to manage their files and folders, including uploading and sharing files.

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- MongoDB

### Installation

1. Clone the repository:

    ```sh
    git clone https://github.com/JakariaJishan/storage-management-system-api.git
    cd storage-management-system
    ```

2. Install the dependencies:

    ```sh
    npm install
    ```

3. Create a `.env` file in the root directory and add the following environment variables:

    ```dotenv
    MONGO_URI=<your_mongodb_connection_string>
    GOOGLE_CLIENT_ID=<your_google_client_id>
    GOOGLE_CLIENT_SECRET=<your_google_client_secret>
    ```

   Replace `<your_mongodb_connection_string>`, `<your_google_client_id>`, and `<your_google_client_secret>` with your actual MongoDB connection string and Google OAuth credentials.

4. Start the server:

    ```sh
    npm start
    ```

   The server will start on port 3000 by default.

## Usage

- Access the application at `http://localhost:3000`.
- Use the provided API endpoints to manage files and folders.

## API Endpoints

- `POST /auth/signup` - Sign up a new user.
- `POST /auth/login` - Log in a user.
- `GET /auth/google` - Log in with Google.
- `POST /auth/forgot-password` - Request a password reset.
- `POST /auth/reset-password/:token` - Reset the password.
- `GET /auth/signout` - Sign out the user.
- `PUT /auth/profile` - Upload avatar and update profile.
- `PUT /auth/password` - Update password.
- `DELETE /auth` - Delete account.
- `GET /storage/dashboard` - Get dashboard data.
- `GET /storage/recent-files` - Get recent files.
- `GET /storage/files-by-date` - Get files filtered by date.
- `DELETE /storage/folders/:id` - Delete a folder.
- `POST /storage/folders` - Create a folder.
- `POST /storage/files` - Upload a file.
- `PUT /storage/files/:id/favorite` - Toggle file favorite status.
- `PUT /storage/files/:id/rename` - Rename a file.
- `POST /storage/files/:id/duplicate` - Duplicate a file.
- `POST /storage/files/:id/copy` - Copy a file to a folder.
- `DELETE /storage/files/:id` - Delete a file.
- `GET /storage/files/:id/share` - Generate a share link for a file.

## License

This project is licensed under the MIT License.