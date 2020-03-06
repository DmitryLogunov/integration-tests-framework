Feature: 'Halo' protocol tests
  Sending 'halo' msg leads to emitting halo messages from subscribers

  @halo
  Scenario Outline: send 'halo' message, check services responds in a right way
    When each service should send message to halo_emit: <service_name>

    Examples:
      | service_name           |
      | initiatorgateway       |
      | commandgateway         |
      | querygateway           |
      | config_service         |
 #   | servicescheduling |
      | usermanagement_service |
      | emailmanagement        |
      | SOAP_INTEGRATOR        |
