package at.htl.boundary;

import at.htl.model.Group;
import at.htl.repositories.GroupRepository;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import javax.transaction.Transactional;
import javax.validation.constraints.Positive;
import javax.ws.rs.*;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;
import java.net.URI;
import java.util.List;

@ApplicationScoped
@Path("/group/")
public class GroupService {

    @Inject
    GroupRepository groupRepository;

    @GET
    @Path("/getAll")
    @Produces(MediaType.APPLICATION_JSON)
    public List<Group> getAllGroups() {
        return groupRepository.listAll();
    }

    @POST
    @Transactional
    @Path("/add")
    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.APPLICATION_JSON)
    public Response create(Group group, @Context UriInfo info) {
        groupRepository.persist(group);
        return Response.
                created(URI.create(info.getPath() + "/" + group.getId()))
                .build();
    }
}
