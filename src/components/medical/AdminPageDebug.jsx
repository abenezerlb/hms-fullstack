import React from "react";
import { useApp } from "@/context/AppContext";

const AdminPageDebug = () => {
    const { users, addUser, deleteUser } = useApp();

    console.log("AdminPage rendered!");
    console.log("Users:", users);

    return (
        <div style={{
            padding: "50px",
            backgroundColor: "red",
            color: "white",
            minHeight: "100vh",
            fontSize: "24px"
        }}>
            <h1>ADMIN PAGE DEBUG</h1>
            <p>If you can see this RED page, the component is rendering!</p>
            <p>Number of users: {users ? users.length : "undefined"}</p>
            <div style={{ marginTop: "20px", padding: "20px", backgroundColor: "yellow", color: "black" }}>
                {users && users.length > 0 ? (
                    <div>
                        <h2>Users found:</h2>
                        {users.map(u => (
                            <div key={u.id}>
                                {u.name} - {u.username} - {u.role}
                            </div>
                        ))}
                    </div>
                ) : (
                    <h2>NO USERS FOUND - This is the problem!</h2>
                )}
            </div>
        </div>
    );
};

export default AdminPageDebug;
