package petition;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import java.util.Collections;
import java.util.List;

public class GoogleAuthVerifier {

    private static final String CLIENT_ID = "849633217364-6qmmvh5i7see24dv9ulb25hvkgqdb6jl.apps.googleusercontent.com";
    
    public static List<Object> verifyToken(String idTokenString, String userId) {
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new JacksonFactory())
                .setAudience(Collections.singletonList(CLIENT_ID))
                .build();

        try {
            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken != null) {
                GoogleIdToken.Payload payload = idToken.getPayload();

                // Print user identifier
                String userIdFromToken = payload.getSubject();
                System.out.println("User ID: " + userIdFromToken);

                // Verify if the userId matches
                String email = payload.getEmail();
                String familyName = (String) payload.get("family_name");
                String givenName = (String) payload.get("given_name");
              
                return List.of(userId.equals(userIdFromToken), email, familyName +" "+givenName);
            } else {
                System.out.println("Token ou Id invalide");
                return List.of(false, null, null);
            }
        } catch (Exception e) {
            e.printStackTrace();
            return List.of(false, null, null);
        }
    }
}
