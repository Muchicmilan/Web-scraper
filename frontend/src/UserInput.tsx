import React, {useState} from "react";
import axios from "axios";

const UserInput: React.FC = () => {
    const [input, setInput] = useState<string>("");

    const handleSubmit = async () => {
        if(!input.trim()) return;
        
        try {
          const response = await axios.post("http://localhost:5000/api/scrape", {url: input});
          console.log("Server Response: ", response.data);
        } catch(error) {
          console.error("Error: ", error);
        }
      };
    return (
        <div>
        <input placeholder="enter the url here" type="text"
        value={input}
        onChange={(e)=> setInput(e.target.value)}
        />
        <button onClick={handleSubmit}>Submit</button>
        </div>
    )

}

export default UserInput;




