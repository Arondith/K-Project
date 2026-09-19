package com.arondith.pulseboard.repository

import com.arondith.pulseboard.model.Incident
import java.util.concurrent.ConcurrentHashMap

interface IncidentRepository {
    fun findAll(): List<Incident>
    fun findById(id: String): Incident?
    fun save(incident: Incident): Incident
    fun delete(id: String): Boolean
}

class InMemoryIncidentRepository : IncidentRepository {
    private val incidents = ConcurrentHashMap<String, Incident>()

    override fun findAll(): List<Incident> =
        incidents.values.sortedByDescending { it.createdAt }

    override fun findById(id: String): Incident? = incidents[id]

    override fun save(incident: Incident): Incident {
        incidents[incident.id] = incident
        return incident
    }

    override fun delete(id: String): Boolean =
        incidents.remove(id) != null
}
