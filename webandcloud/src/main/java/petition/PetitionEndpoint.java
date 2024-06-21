package petition;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.ConcurrentModificationException;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

import com.google.api.server.spi.config.Api;
import com.google.api.server.spi.config.ApiMethod;
import com.google.api.server.spi.config.ApiMethod.HttpMethod;
import com.google.appengine.api.datastore.Cursor;
import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.EntityNotFoundException;
import com.google.appengine.api.datastore.FetchOptions;
import com.google.appengine.api.datastore.PreparedQuery;
import com.google.appengine.api.datastore.Query;
import com.google.appengine.api.datastore.QueryResultList;
import com.google.appengine.api.datastore.Text;
import com.google.appengine.api.datastore.Query.Filter;
import com.google.appengine.api.datastore.Query.FilterPredicate;
import com.google.appengine.api.datastore.Query.SortDirection;

import javax.inject.Named;
import com.google.api.server.spi.config.Nullable;
import com.google.api.server.spi.response.ConflictException;
import com.google.api.server.spi.response.NotFoundException;
import com.google.api.server.spi.response.UnauthorizedException;
import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.KeyFactory;

import com.google.appengine.api.datastore.Transaction;


@Api(name = "myTinyPet",
     version = "v666",
     audiences = "927375242383-t21v9ml38tkh2pr30m4hqiflkl3jfohl.apps.googleusercontent.com",
  	 clientIds = {"927375242383-t21v9ml38tkh2pr30m4hqiflkl3jfohl.apps.googleusercontent.com",
        "927375242383-jm45ei76rdsfv7tmjv58tcsjjpvgkdje.apps.googleusercontent.com"}
        
     )
public class PetitionEndpoint {

    private static final int DEFAULT_LIMIT_USER = 3; // Limite par défaut pour la pagination
    private static final int DEFAULT_LIMIT_PET_CREATED = 5; // Limite par défaut pour la pagination
       
    /*
     * Méthode pour récupérer le pseudo à partir de l'email
     */
    private String getPseudoByEmail(String email, DatastoreService datastore) throws NotFoundException {
        Query.Filter emailFilter = new Query.FilterPredicate("mail", Query.FilterOperator.EQUAL, email);
        Query q = new Query("Client").setFilter(emailFilter);
        PreparedQuery pq = datastore.prepare(q);
        Entity userEntity = pq.asSingleEntity();
    
        if (userEntity == null) {
            throw new NotFoundException("Utilisateur non trouvé pour l'email : " + email);
        }
    
        return (String) userEntity.getProperty("pseudo");
    }
    
    /*
     * Méthode pour récupérer une liste de pseudo paginée
     */
    private PaginatedUserResponse getUserPseudosByPetitionId(Long petitionId, DatastoreService datastore, String startCursor, int limit) {
        String petitionKeyString = KeyFactory.keyToString(KeyFactory.createKey("Petition", petitionId));
    
        // Rechercher tous les utilisateurs qui ont signé cette pétition
        Query.Filter petitionFilter = new Query.FilterPredicate("petitionsSigne", Query.FilterOperator.EQUAL, petitionKeyString);
        Query q = new Query("Client").setFilter(petitionFilter);
    
        FetchOptions fetchOptions = FetchOptions.Builder.withLimit(limit);
        if (startCursor != null && !startCursor.isEmpty()) {
            fetchOptions.startCursor(Cursor.fromWebSafeString(startCursor));
        }
    
        PreparedQuery pq = datastore.prepare(q);
        QueryResultList<Entity> results = pq.asQueryResultList(fetchOptions);
    
        List<String> userPseudos = new ArrayList<>();
        for (Entity userEntity : results) {
            String pseudo = (String) userEntity.getProperty("pseudo");
            userPseudos.add(pseudo);
        }
    
        String endCursor = (results.getCursor() != null) ? results.getCursor().toWebSafeString() : null;
        return new PaginatedUserResponse(userPseudos, endCursor);
    }
    

    /*
     * Méthode pour récupérer une pétition via l'id classique d'une pétition
     */
    @ApiMethod(name = "getPetition", path = "petition/{id}", httpMethod = HttpMethod.GET)
    private Entity getPetitionById(@Named("id") Long id) throws NotFoundException {
        
        DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
        Key petitionKey = KeyFactory.createKey("Petition", id);
    
        Query.Filter keyFilter = new Query.FilterPredicate(Entity.KEY_RESERVED_PROPERTY, Query.FilterOperator.EQUAL, petitionKey);
        Query query = new Query("Petition").setFilter(keyFilter);
        PreparedQuery preparedQuery = datastore.prepare(query);
    
        Entity petitionEntity = preparedQuery.asSingleEntity();
        if (petitionEntity != null) {
            return petitionEntity;
        } else {
            throw new NotFoundException("Votre pétition n'a pas été trouvée selon l'id : " + id);
        }
    }

    private List<String> getPaginatedPetitionIds(List<String> petitionIds, @Nullable String cursor, int limit) {
        int startIndex = 0;
        if (cursor != null && !cursor.isEmpty()) {
            try {
                startIndex = Integer.parseInt(cursor);
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Le curseur fourni est invalide : " + cursor);
            }
        }
    
        if (startIndex < 0 || startIndex >= petitionIds.size()) {
            throw new IndexOutOfBoundsException("Le curseur est hors des limites de la liste des pétitions.");
        }
    
        int endIndex = Math.min(startIndex + limit, petitionIds.size());
        return new ArrayList<>(petitionIds.subList(startIndex, endIndex));
    }
    
    private String getNextCursor(List<String> petitionIds, String currentCursor, int limit) {
        int startIndex = 0;
        if (currentCursor != null && !currentCursor.isEmpty()) {
            try {
                startIndex = Integer.parseInt(currentCursor);
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Le curseur fourni est invalide : " + currentCursor);
            }
        }
    
        int endIndex = Math.min(startIndex + limit, petitionIds.size());
        if (endIndex >= petitionIds.size()) {
            return null; // No more results
        }
    
        return String.valueOf(endIndex);
    }
    

    @ApiMethod(name = "petitionCreatedUser", path = "petitionCreatedUser/{userId}", httpMethod = ApiMethod.HttpMethod.GET)
    public PaginatedResponse getPetitionCreatedByUser(
            @Named("userId") String userId,
            @Named("cursor") @Nullable String cursor) throws NotFoundException {
    
        DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
        int limit = DEFAULT_LIMIT_PET_CREATED;
    
        // Rechercher l'utilisateur par son email
        Query.Filter emailFilter = new Query.FilterPredicate("mail", Query.FilterOperator.EQUAL, userId);
        Query userQuery = new Query("Client").setFilter(emailFilter);
        PreparedQuery userPq = datastore.prepare(userQuery);
        Entity userEntity = userPq.asSingleEntity();
    
        if (userEntity == null) {
            throw new NotFoundException("Votre email n'a pas été trouvé, vous n'avez pas de compte pour : " + userId);
        }
    
        // Récupérer la liste des IDs de pétitions créées
        List<String> createdPetitionIds = (List<String>) userEntity.getProperty("petitions");
        if (createdPetitionIds == null || createdPetitionIds.isEmpty()) {
            throw new NotFoundException("Pas de pétition créée trouvée pour l'utilisateur avec le mail : " + userId);
        }
    
        // Paginer sur les IDs de pétitions
        List<String> paginatedIds;
        try {
            paginatedIds = getPaginatedPetitionIds(createdPetitionIds, cursor, limit);
        } catch (IndexOutOfBoundsException e) {
            throw new IllegalArgumentException("Le curseur est hors des limites de la liste des pétitions : " + cursor, e);
        }
    
        // Convertir les IDs de pétitions en objets Key
        List<Key> petitionKeys = paginatedIds.stream()
                .map(KeyFactory::stringToKey)
                .collect(Collectors.toList());
    
        // Créer une requête pour récupérer les pétitions par leur Key, triées par date de création décroissante
        Query petitionQuery = new Query("Petition").setFilter(new Query.FilterPredicate(
                "__key__", Query.FilterOperator.IN, petitionKeys)).addSort("creationDate", Query.SortDirection.DESCENDING);
        PreparedQuery pq = datastore.prepare(petitionQuery);
    
        QueryResultList<Entity> petitionEntities = pq.asQueryResultList(FetchOptions.Builder.withLimit(limit));
    
        List<ResponseMyPetDTO> response = new ArrayList<>();
        SimpleDateFormat dateFormat = new SimpleDateFormat("dd-MM-yyyy HH:mm");
    
        for (Entity petitionEntity : petitionEntities) {
            String namePetition = (String) petitionEntity.getProperty("nom");
            String description = ((Text) petitionEntity.getProperty("description")).getValue();
            Date creationDate = (Date) petitionEntity.getProperty("creationDate");
            String email = (String) petitionEntity.getProperty("mailCreateur");
            long nbsignataires = (long) petitionEntity.getProperty("nbSignatures");
            List<String> tags = (List<String>) petitionEntity.getProperty("tags");
            Long id = petitionEntity.getKey().getId();  // Obtenir l'ID de la clé
    
            // Récupérer les pseudos des utilisateurs ayant signé la pétition
            PaginatedUserResponse signataires = getUserPseudosByPetitionId(id, datastore, null, DEFAULT_LIMIT_USER);
    
            // Récupérer le pseudo du créateur de la pétition
            String pseudo = getPseudoByEmail(email, datastore);
    
            // Formatter la date
            String formattedDate = dateFormat.format(creationDate);
    
            response.add(new ResponseMyPetDTO(id, namePetition, description, signataires.getUserPseudos(), nbsignataires, pseudo, formattedDate, tags, signataires.getCursor()));
        }
    // Obtenir le prochain curseur
    String nextCursor = getNextCursor(createdPetitionIds, cursor, limit);
        return new PaginatedResponse(response, nextCursor);
    }

    /*
     * Obtention de la liste des pétitions signées par un utilisateur
     */
    @ApiMethod(name = "petitionSignedUser", path = "petitionSignedUser/{userId}", httpMethod = ApiMethod.HttpMethod.GET)
    public List<ResponseSignedPetDTO> getPetitionSignedByUser(@Named("userId") String userId) throws NotFoundException {
        DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();

        // Rechercher l'utilisateur par son email
        Query.Filter emailFilter = new Query.FilterPredicate("mail", Query.FilterOperator.EQUAL, userId);
        Query userQuery = new Query("Client").setFilter(emailFilter);
        PreparedQuery userPq = datastore.prepare(userQuery);
        Entity userEntity = userPq.asSingleEntity();

        if (userEntity == null) {
            throw new NotFoundException("Votre email n'a pas été trouvé, vous n'avez pas de compte pour : " + userId);
        }

        // Récupérer la liste des IDs de pétitions signées
        List<String> signedPetitionIds = (List<String>) userEntity.getProperty("petitionsSigne");
        if (signedPetitionIds == null || signedPetitionIds.isEmpty()) {
            throw new NotFoundException("Pas de pétition trouvée pour l'utilisateur avec le mail : " + userId);
        }

        // Convertir les IDs de pétitions en objets Key
        List<Key> petitionKeys = signedPetitionIds.stream()
                .map(KeyFactory::stringToKey)
                .collect(Collectors.toList());

        // Créer une requête pour récupérer les pétitions par leur Key, triées par date de création décroissante
        Query petitionQuery = new Query("Petition").setFilter(new Query.FilterPredicate(
            "__key__", Query.FilterOperator.IN, petitionKeys)).addSort("creationDate", Query.SortDirection.DESCENDING);
        PreparedQuery pq = datastore.prepare(petitionQuery);
        
        List<Entity> petitionEntities = pq.asList(FetchOptions.Builder.withLimit(100));
        List<ResponseSignedPetDTO> response = new ArrayList<>();
        SimpleDateFormat dateFormat = new SimpleDateFormat("dd-MM-yyyy HH:mm");

        for (Entity petitionEntity : petitionEntities) {
            String namePetition = (String) petitionEntity.getProperty("nom");
            String description = ((Text) petitionEntity.getProperty("description")).getValue();
            Date creationDate = (Date) petitionEntity.getProperty("creationDate");
            String email = (String) petitionEntity.getProperty("mailCreateur");
            long nbsignataires = (long) petitionEntity.getProperty("nbSignatures");
            List<String> tags = (List<String>) petitionEntity.getProperty("tags");
            Long id = petitionEntity.getKey().getId();  // Obtenir l'ID de la clé

            // Récupérer le pseudo du créateur de la pétition
            String pseudo = getPseudoByEmail(email, datastore);

            // Formatter la date
            String formattedDate = dateFormat.format(creationDate);

            response.add(new ResponseSignedPetDTO(id, namePetition, description, nbsignataires, pseudo, formattedDate,tags));
        }

        return response;
    }

    /*
     * Obtention de la liste paginée des utilisateurs ayant signée une pétition donnée
     */
    @ApiMethod(name = "getSignatureUsers", path = "usersSigned/{id}", httpMethod = ApiMethod.HttpMethod.GET)
    public PaginatedUserResponse getSignatureUsers(@Named("id") Long id, @Named("cursor") @Nullable String cursor) throws NotFoundException {
        DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
        return getUserPseudosByPetitionId(id, datastore, cursor, DEFAULT_LIMIT_USER);
    }
    
    /*
     * Obtention des 100 pétitions les plus récentes triées par date les plus récentes
     */
    @ApiMethod(name = "getTop100Petitions", path = "top100Petitions", httpMethod = ApiMethod.HttpMethod.GET)
    public List<ResponseDTOtop100> getTopPetitions() throws NotFoundException {
        DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();

        // Créer une requête pour récupérer les pétitions triées par date de création, les plus récentes en premier
        Query query = new Query("Petition").addSort("creationDate", Query.SortDirection.DESCENDING);

        // Exécuter la requête et limiter les résultats aux 100 premières pétitions
        PreparedQuery preparedQuery = datastore.prepare(query);
        List<Entity> topPetitions = preparedQuery.asList(FetchOptions.Builder.withLimit(100));

        // Créer une liste pour les réponses des pétitions
        List<ResponseDTOtop100> petitionResponses = new ArrayList<>();

        // Formatter de la date
        SimpleDateFormat dateFormat = new SimpleDateFormat("dd-MM-yyyy HH:mm");

        // Parcourir les pétitions et créer des objets ResponseDTOtop100
        for (Entity petitionEntity : topPetitions) {
            String namePetition = (String) petitionEntity.getProperty("nom");
            String description = ((Text) petitionEntity.getProperty("description")).getValue();
            Date creationDate = (Date) petitionEntity.getProperty("creationDate");
            String email = (String) petitionEntity.getProperty("mailCreateur"); 
            long nbsignataires = (long) petitionEntity.getProperty("nbSignatures");
            List<String> tags = (List<String>) petitionEntity.getProperty("tags");

            long id = petitionEntity.getKey().getId();  // Obtenir l'ID de la clé

            // Récupérer le pseudo à partir de l'entité Client via l'email
            String pseudo = getPseudoByEmail(email, datastore);


            // Formatter la date
            String formattedDate = dateFormat.format(creationDate);

            // Ajouter un nouvel objet ResponseDTOtop100 à la liste
            ResponseDTOtop100 response = new ResponseDTOtop100(id,namePetition, description, nbsignataires, pseudo, formattedDate,tags);
            petitionResponses.add(response);
        }

        return petitionResponses;
    }



    /*
    * Signer une pétition à partir de l'id d'une pétition et d'un token d'authentification google
    */
    @ApiMethod(name = "signerPetition", path = "signer", httpMethod = HttpMethod.POST)
    public Entity signerPetition(PostSignerPetitionDto pm) throws NotFoundException, UnauthorizedException {
        // Vérifier le jeton et l'ID utilisateur
        List<Object> result;
        try {
            result = GoogleAuthVerifier.verifyToken(pm.token, pm.userId);
        } catch (Exception e) {
            throw new UnauthorizedException("Votre Id ou votre token est invalide ou expiré.");
        }

        boolean isVerified = (Boolean) result.get(0);
        String email = (String) result.get(1);
        if (!isVerified) {
            throw new UnauthorizedException("Votre Id ou votre token est invalide ou expiré.");
        }

        DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
        Entity petitionEntity = getPetitionById(pm.id); // retourne une erreur 404 si la pétition n'existe pas

        String mailCreateur = (String) petitionEntity.getProperty("mailCreateur");
        if (mailCreateur != null && mailCreateur.equals(email)) {
            throw new UnauthorizedException("Vous ne pouvez pas signer votre propre pétition, votre email : " + email);
        }

        // Rechercher l'utilisateur par son email
        Query.Filter emailFilter = new Query.FilterPredicate("mail", Query.FilterOperator.EQUAL, email);
        Query userQuery = new Query("Client").setFilter(emailFilter);
        PreparedQuery userPq = datastore.prepare(userQuery);
        Entity userEntity = userPq.asSingleEntity();

        if (userEntity == null) {
            throw new NotFoundException("Votre email est inconnu, votre email : " + email);
        }

        // Vérifier si l'utilisateur a déjà signé cette pétition
        List<String> petitionIds = (List<String>) userEntity.getProperty("petitionsSigne");
        if (petitionIds == null) {
            petitionIds = new ArrayList<>();
        }
        String petitionKeyString = KeyFactory.keyToString(petitionEntity.getKey());
        if (petitionIds.contains(petitionKeyString)) {
            throw new UnauthorizedException("Vous ne pouvez pas signer une pétition deux fois, votre email : " + email);
        }

        boolean success = false;
        while (!success) {
            Transaction txn = datastore.beginTransaction();
            try {
                // Recharger l'entité de la pétition pour vérifier les signatures en cours
                petitionEntity = datastore.get(txn, petitionEntity.getKey());
                long nb_signatures = (Long) petitionEntity.getProperty("nbSignatures");
                petitionEntity.setProperty("nbSignatures", nb_signatures + 1);
                datastore.put(txn, petitionEntity);

                // Ajouter la pétition à la liste des pétitions signées de l'utilisateur
                petitionIds.add(petitionKeyString);
                userEntity.setProperty("petitionsSigne", petitionIds);
                datastore.put(txn, userEntity);

                txn.commit();
                success = true;
            } catch (ConcurrentModificationException e) {
                // Transaction failed due to concurrent modification, retry
                if (txn.isActive()) {
                    txn.rollback();
                }
            } catch (EntityNotFoundException e) {
                throw new NotFoundException("Pétition non trouvée.");
            } finally {
                if (txn.isActive()) {
                    txn.rollback();
                }
            }
        }

        return petitionEntity;
    }

    /*
    * Obtention d'une liste de pétition possèdant au moins un des tags de la liste de tags reçu
    */
    @ApiMethod(name = "getPetitionsByTags", path = "petitionsByTags/{tags}", httpMethod = HttpMethod.GET)
    public List<ResponseDTOtop100> getPetitionsByTags(@Named("tags") String tags) throws NotFoundException {
        DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();

        // Créer une liste de filtres pour chaque tag
        List<Filter> tagFilters = new ArrayList<>();
        String[] chaine_tags = tags.split(",");
        for (String tag : chaine_tags) {
            tagFilters.add(new FilterPredicate("tags", Query.FilterOperator.EQUAL, tag));
        }

        Query query;
        if (tagFilters.size() == 1) {
            // Si un seul tag est présent, créer une requête simple
            query = new Query("Petition")
                    .setFilter(tagFilters.get(0))
                    .addSort("creationDate", SortDirection.DESCENDING);
        } else if (tagFilters.size() > 1) {
            // Combiner les filtres avec un opérateur OR
            Filter compositeFilter = tagFilters.get(0);
            for (int i = 1; i < tagFilters.size(); i++) {
                compositeFilter = Query.CompositeFilterOperator.or(compositeFilter, tagFilters.get(i));
            }
            // Créer une requête pour récupérer les pétitions avec au moins un tag correspondant, triées par date de création
            query = new Query("Petition")
                    .setFilter(compositeFilter)
                    .addSort("creationDate", SortDirection.DESCENDING);
        } else {
            // Aucun tag n'est fourni, retourner une liste vide
            return new ArrayList<>();
        }

        // Exécuter la requête
        PreparedQuery preparedQuery = datastore.prepare(query);
        List<Entity> petitionsByTags = preparedQuery.asList(FetchOptions.Builder.withLimit(100));
        
        List<ResponseDTOtop100> petitionResponses = new ArrayList<>();
        // Formatter de la date
        SimpleDateFormat dateFormat = new SimpleDateFormat("dd-MM-yyyy HH:mm");

        for (Entity petitionEntity : petitionsByTags) {
            String namePetition = (String) petitionEntity.getProperty("nom");
            String description = ((Text) petitionEntity.getProperty("description")).getValue();
            Date creationDate = (Date) petitionEntity.getProperty("creationDate");
            String email = (String) petitionEntity.getProperty("mailCreateur"); 
            long nbsignataires = (long) petitionEntity.getProperty("nbSignatures"); 
            List<String> tagsPet = (List<String>) petitionEntity.getProperty("tags");
            long id = petitionEntity.getKey().getId();  // Obtenir l'ID de la clé

            // Récupérer le pseudo à partir de l'entité Client via l'email
            String pseudo = getPseudoByEmail(email, datastore);

            

            // Formatter la date
            String formattedDate = dateFormat.format(creationDate);

            // Ajouter un nouvel objet ResponseDTOtop100 à la liste
            ResponseDTOtop100 response = new ResponseDTOtop100(id,namePetition, description, nbsignataires, pseudo, formattedDate,tagsPet);
            petitionResponses.add(response);
        }

        return petitionResponses;
    }


    /*
     * Ajout d'un utilisateur à notre datastore
     */
	@ApiMethod(name = "addUser", path = "addUser", httpMethod = HttpMethod.POST)
    public Entity addUser(CreateUserDTO pm) throws UnauthorizedException, ConflictException {
        List<Object> result =null;

        try{
            result = GoogleAuthVerifier.verifyToken(pm.token, pm.userId);

       }
       catch (Exception e) {
           throw new UnauthorizedException("Votre Id ou votre token est invalide ou expiré.");
       }
       boolean isVerified = (Boolean) result.get(0);
       String email = (String) result.get(1);
       String pseudo = (String) result.get(2);
       if (!isVerified) {
           throw new UnauthorizedException("Votre Id ou votre token est invalide ou expiré.");
       }
        DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
        Transaction txn = datastore.beginTransaction();

        Query.Filter propertyFilter = new Query.FilterPredicate("mail", Query.FilterOperator.EQUAL, email);
            Query q = new Query("Client").setFilter(propertyFilter);
            PreparedQuery pq = datastore.prepare(q);
            Entity userEntity = pq.asSingleEntity();
        if (userEntity == null){ // Si le nouvel utilisateur n'est pas déjà dans notre base de données
            try {
                // Stocker le user
                userEntity = new Entity("Client");
                userEntity.setProperty("mail", email);
                userEntity.setProperty("pseudo", (pm.pseudo==null || pm.pseudo=="") ? pseudo : pm.pseudo); // si le pseudo de l'utilisateur est vide, alors on utilise son nom prénom google
                datastore.put(txn, userEntity);
                txn.commit();
                return userEntity;
        } finally {
            if (txn.isActive()) {
                txn.rollback();
            }
        }
        }
        else {
            throw new ConflictException("Utilisateur déjà créé : " + email);
        }

    }

    
    
    /*
    * Création d'une pétition, puis ajout de celle-ci au datastore
    * Si par hasard un fourbe d'utilisateur essait de créer une pétition sans compte créé, on le cré en base avant
    */
    @ApiMethod(name = "createPetition", httpMethod = HttpMethod.POST)
    public Entity createPetition(PostPetitionDTO pm) throws UnauthorizedException {
        // Vérifier le jeton et l'ID utilisateur
        List<Object> result = null;
        try {
            result = GoogleAuthVerifier.verifyToken(pm.token, pm.userId);
        } catch (Exception e) {
            throw new UnauthorizedException("Votre Id ou votre token est invalide ou expiré.");
        }
        boolean isVerified = (Boolean) result.get(0);
        String email = (String) result.get(1);
        String name = (String) result.get(2);
        if (!isVerified) {
            throw new UnauthorizedException("Votre Id ou votre token est invalide ou expiré.");
        }

        DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
        Transaction txn = datastore.beginTransaction();

        HashSet<String> tags = new HashSet<>();
        String[] chaine_tags = pm.tags.split(",");

        // HashSet : chaque élément est par défaut unique
        for (String tag : chaine_tags) {
            tags.add(tag);
        }

        Entity petitionEntity = new Entity("Petition");
        petitionEntity.setProperty("nom", pm.name);
        petitionEntity.setProperty("description", new Text(pm.description));
        petitionEntity.setProperty("tags", tags);
        petitionEntity.setProperty("mailCreateur", email);
        petitionEntity.setProperty("creationDate", new Date());
        petitionEntity.setProperty("nbSignatures", 0); // il n'y a pas de signature quand la pétition est créée

        try {
            // Stocker la pétition
            datastore.put(txn, petitionEntity);
            // Récupérer l'identifiant de l'entité après l'insertion
            String petitionKey = KeyFactory.keyToString(petitionEntity.getKey());

            // Vérifier si l'utilisateur existe déjà
            Query.Filter propertyFilter = new Query.FilterPredicate("mail", Query.FilterOperator.EQUAL, email);
            Query q = new Query("Client").setFilter(propertyFilter);
            PreparedQuery pq = datastore.prepare(q);
            Entity userEntity = pq.asSingleEntity();

            if (userEntity == null) {
                // Créer un nouvel utilisateur
                userEntity = new Entity("Client");
                userEntity.setProperty("mail", email);
                userEntity.setProperty("petitions", new ArrayList<>(Arrays.asList(petitionKey)));
                userEntity.setProperty("pseudo", name);
            } else {
                // Récupérer les pétitions existantes
                List<String> existingPetitions = (List<String>) userEntity.getProperty("petitions");
                if (existingPetitions == null) {
                    existingPetitions = new ArrayList<>();
                }
                // Ajouter la nouvelle pétition
                existingPetitions.add(0, petitionKey);
                // Mettre à jour la propriété petitions
                userEntity.setProperty("petitions", existingPetitions);
            }

            datastore.put(txn, userEntity);
            txn.commit();
        } finally {
            if (txn.isActive()) {
                txn.rollback();
            }
        }
        
        return petitionEntity;
    }


}