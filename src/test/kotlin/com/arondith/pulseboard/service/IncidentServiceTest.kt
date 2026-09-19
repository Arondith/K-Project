package com.arondith.pulseboard.service

import com.arondith.pulseboard.model.CreateIncidentRequest
import com.arondith.pulseboard.model.IncidentStatus
import com.arondith.pulseboard.model.Severity
import com.arondith.pulseboard.repository.InMemoryIncidentRepository
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class IncidentServiceTest {
    private val fixedTime = "2026-09-19T03:30:00Z"

    @Test
    fun `creates an incident with normalized input and open status`() {
        val service = service()

        val incident = service.create(
            CreateIncidentRequest(
                title = "  Production API outage  ",
                description = "  Checkout requests are failing with HTTP 500 errors.  ",
                severity = Severity.CRITICAL,
                owner = "  platform-team  "
            )
        )

        assertEquals("INC-001", incident.id)
        assertEquals("Production API outage", incident.title)
        assertEquals("Checkout requests are failing with HTTP 500 errors.", incident.description)
        assertEquals("platform-team", incident.owner)
        assertEquals(IncidentStatus.OPEN, incident.status)
        assertEquals(1, incident.version)
        assertEquals(fixedTime, incident.createdAt)
    }

    @Test
    fun `rejects an invalid short description`() {
        val service = service()

        assertFailsWith<ValidationException> {
            service.create(
                CreateIncidentRequest(
                    title = "API outage",
                    description = "Too short",
                    severity = Severity.HIGH
                )
            )
        }
    }

    @Test
    fun `applies valid lifecycle transitions and increments version`() {
        val service = service()
        val created = createDefaultIncident(service)

        val investigating = service.transition(created.id, IncidentStatus.INVESTIGATING)
        val mitigated = service.transition(created.id, IncidentStatus.MITIGATED)
        val resolved = service.transition(created.id, IncidentStatus.RESOLVED)

        assertEquals(IncidentStatus.INVESTIGATING, investigating.status)
        assertEquals(2, investigating.version)
        assertEquals(IncidentStatus.MITIGATED, mitigated.status)
        assertEquals(3, mitigated.version)
        assertEquals(IncidentStatus.RESOLVED, resolved.status)
        assertEquals(4, resolved.version)
    }

    @Test
    fun `rejects invalid status transition`() {
        val service = service()
        val created = createDefaultIncident(service)

        assertFailsWith<InvalidStatusTransitionException> {
            service.transition(created.id, IncidentStatus.RESOLVED)
        }
    }

    @Test
    fun `deleting a missing incident returns a domain not found error`() {
        val service = service()

        assertFailsWith<IncidentNotFoundException> {
            service.delete("missing")
        }
    }

    private fun service() = IncidentService(
        repository = InMemoryIncidentRepository(),
        idGenerator = { "INC-001" },
        nowProvider = { fixedTime }
    )

    private fun createDefaultIncident(service: IncidentService) =
        service.create(
            CreateIncidentRequest(
                title = "Database latency",
                description = "Database queries are exceeding the latency threshold.",
                severity = Severity.HIGH
            )
        )
}
