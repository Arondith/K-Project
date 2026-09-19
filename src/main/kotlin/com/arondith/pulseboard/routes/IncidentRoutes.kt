package com.arondith.pulseboard.routes

import com.arondith.pulseboard.model.CreateIncidentRequest
import com.arondith.pulseboard.model.HealthResponse
import com.arondith.pulseboard.model.UpdateStatusRequest
import com.arondith.pulseboard.service.IncidentService
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.patch
import io.ktor.server.routing.post
import io.ktor.server.routing.route

fun Route.incidentRoutes(service: IncidentService) {
    get("/health") {
        call.respond(
            HealthResponse(
                status = "ok",
                service = "pulseboard-api"
            )
        )
    }

    route("/api/incidents") {
        get {
            call.respond(service.list())
        }

        post {
            val request = call.receive<CreateIncidentRequest>()
            call.respond(HttpStatusCode.Created, service.create(request))
        }

        get("/{id}") {
            call.respond(service.get(call.requireId()))
        }

        patch("/{id}/status") {
            val request = call.receive<UpdateStatusRequest>()
            call.respond(service.transition(call.requireId(), request.status))
        }

        delete("/{id}") {
            service.delete(call.requireId())
            call.respond(HttpStatusCode.NoContent)
        }
    }
}

private fun io.ktor.server.application.ApplicationCall.requireId(): String =
    parameters["id"]?.takeIf { it.isNotBlank() }
        ?: throw IllegalArgumentException("Incident id is required")
