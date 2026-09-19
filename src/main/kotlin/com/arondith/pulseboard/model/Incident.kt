package com.arondith.pulseboard.model

import kotlinx.serialization.Serializable

@Serializable
data class Incident(
    val id: String,
    val title: String,
    val description: String,
    val severity: Severity,
    val status: IncidentStatus,
    val owner: String? = null,
    val createdAt: String,
    val updatedAt: String,
    val version: Int = 1
)

@Serializable
enum class Severity {
    LOW,
    MEDIUM,
    HIGH,
    CRITICAL
}

@Serializable
enum class IncidentStatus {
    OPEN,
    INVESTIGATING,
    MITIGATED,
    RESOLVED
}
