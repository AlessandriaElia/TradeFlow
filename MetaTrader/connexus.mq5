int OnInit()
{
   string method = "POST";                   
   string url = "http://127.0.0.1:5000/post";  
   string headers = "Content-Type: application/json"; 
   int timeout = 5000;                      
   char data[];                             
   char result[];                           
   string result_headers;                   

   string body = 
      "{"
         "\"id\": 1,"
         "\"name\": \"Quantum Trader\","
         "\"creator\": \"John Doe\","
         "\"description\": \"Un Expert Advisor avanzato basato su algoritmi quantistici per massimizzare i profitti.\","
         "\"performance\": {"
            "\"roi\": 12.5,"
            "\"risk_level\": \"Medio\","
            "\"win_rate\": 78"
         "},"
         "\"price\": 199,"
         "\"stars\": 4,"
         "\"reviews\": 120,"
         "\"image\": \"Quantum Trader.webp\","
         "\"historical_data\": \"Quantum Trader.json\""
      "}";

   StringToCharArray(body, data, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayRemove(data, ArraySize(data) - 1);
   
   Print("Body: ", body);
   Print("Body Size: ", StringLen(body));
   ArrayPrint(data);
   Print("Array Size: ", ArraySize(data));

   int status_code = WebRequest(method, url, headers, timeout, data, result, result_headers);
   
   Print("Status code: ", status_code);
   Print("Response: ", CharArrayToString(result)); 

   return(INIT_SUCCEEDED);
}
