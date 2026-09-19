package com.arondith.pulseboard.service

import com.arondith.pulseboard.model.CreateIncidentRequest
import com.arondith.pulseboard.model.Incident
import com.arondith.pulseboard.model.IncidentStatus
import com.arondith.pulseboard.repository.IncidentRepository
import java.time.Instant
import java.util.UUID

class ValidationException(message: String) : RuntimeException(message)
class IncidentNotFoundException(id: String) : RuntimeException("Incident '$id' was not found")
class InvalidStatusTransitionException(from: IncidentStatus, to: IncidentStatus) :
    RuntimeException("Cannot transition incident from $from to $to")

class IncidentService(
    private val repository: IncidentRepository,
    private val idGenerator: () -> String = { UUID.randomUUID().toString() },
    private val nowProvider: () -> String = { Instant.now().toString() }
) {
    fun list(): List<Incident> = repository.findAll()

    fun get(id: String): Incident =
        repository.findById(id) ?: throw IncidentNotFoundException(id)

    fun create(request: CreateIncidentRequest): Incident {
        val title = request.title.trim()
        val description = request.description.trim()
        val owner = request.owner?.trim()?.takeIf { it.isNotEmpty() }

        validate(title, description)

        val now = nowProvider()
        return repository.save(
            Incident(
                id = idGenerator(),
                title = title,
                description = description,
                severity = request.severity,
                status = IncidentStatus.OPEN,
                owner = owner,
                createdAt = now,
                updatedAt = now
            )
        )
    }

    fun transition(id: String, targetStatus: IncidentStatus): Incident {
        val current = get(id)

        if (current.status == targetStatus) {
            return current
        }

        if (!isAllowedTransition(current.status, targetStatus)) {
            throw InvalidStatusTransitionException(current.status, targetStatus)
        }

        return repository.save(
            current.copy(
                status = targetStatus,
                updatedAt = nowProvider(),
                version = current.version + 1
            )
        )
    }

    fun delete(id: String) {
        if (!repository.delete(id)) {
            throw IncidentNotFoundException(id)
        }
    }

    private fun validate(title: String, description: String) {
        if (title.length !in 3..120) {
            throw ValidationException("Title must contain between 3 and 120 characters")
        }
        if (description.length !in 10..2000) {
            throw ValidationException("Description must contain between 10 and 2000 characters")
        }
    }

    private fun isAllowedTransition(from: IncidentStatus, to: IncidentStatus): Boolean =
        when (from) {
            IncidentStatus.OPEN -> to == IncidentStatus.INVESTIGATING
            IncidentStatus.INVESTIGATING ->
                to == IncidentStatus.MITIGATED || to == IncidentStatus.RESOLVED
            IncidentStatus.MITIGATED ->
                to == IncidentStatus.INVESTIGATING || to == IncidentStatus.RESOLVED
            IncidentStatus.RESOLVED -> false
        }
}
