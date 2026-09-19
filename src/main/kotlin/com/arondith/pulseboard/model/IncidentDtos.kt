package com.arondith.pulseboard.model

import kotlinx.serialization.Serializable

@Serializable
data class CreateIncidentRequest(
    val title: String,
    val description: String,
    val severity: Severity,
    val owner: String? = null
)

@Serializable
data class UpdateStatusRequest(
    val status: IncidentStatus
)

@Serializable
data class ErrorResponse(
    val error: String
)

@Serializable
data class HealthResponse(
    val status: String,
    val service: String
)
