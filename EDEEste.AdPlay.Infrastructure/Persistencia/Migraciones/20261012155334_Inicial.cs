using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace EDEEste.AdPlay.Infrastructure.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ArchivosMultimedia",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NombreOriginal = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ClaveAlmacenamiento = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    TipoMultimedia = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    TipoMime = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    TamanoBytes = table.Column<long>(type: "bigint", nullable: false),
                    HashSha256 = table.Column<string>(type: "nchar(64)", fixedLength: true, maxLength: 64, nullable: false),
                    Ancho = table.Column<int>(type: "int", nullable: true),
                    Alto = table.Column<int>(type: "int", nullable: true),
                    DuracionSegundos = table.Column<int>(type: "int", nullable: true),
                    FechaCargaUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false),
                    UsuarioCargaId = table.Column<int>(type: "int", nullable: true),
                    EstaArchivado = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArchivosMultimedia", x => x.Id);
                    table.CheckConstraint("CK_ArchivosMultimedia_DuracionSegundos", "[DuracionSegundos] IS NULL OR [DuracionSegundos] > 0");
                    table.CheckConstraint("CK_ArchivosMultimedia_TamanoBytes", "[TamanoBytes] > 0");
                });

            migrationBuilder.CreateTable(
                name: "ListasReproduccion",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Descripcion = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    EstaActiva = table.Column<bool>(type: "bit", nullable: false),
                    FechaCreacionUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false),
                    FechaActualizacionUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: true),
                    UsuarioCreadorId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListasReproduccion", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Sucursales",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Codigo = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ZonaHorariaId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    EstaActiva = table.Column<bool>(type: "bit", nullable: false),
                    FechaCreacionUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sucursales", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Anuncios",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Titulo = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Descripcion = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ArchivoMultimediaId = table.Column<int>(type: "int", nullable: false),
                    DuracionPredeterminadaSegundos = table.Column<int>(type: "int", nullable: false),
                    EstaActivo = table.Column<bool>(type: "bit", nullable: false),
                    FechaCreacionUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false),
                    UsuarioCreadorId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Anuncios", x => x.Id);
                    table.CheckConstraint("CK_Anuncios_DuracionPredeterminadaSegundos", "[DuracionPredeterminadaSegundos] > 0");
                    table.ForeignKey(
                        name: "FK_Anuncios_ArchivosMultimedia_ArchivoMultimediaId",
                        column: x => x.ArchivoMultimediaId,
                        principalTable: "ArchivosMultimedia",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PublicacionesListas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ListaReproduccionId = table.Column<int>(type: "int", nullable: false),
                    NumeroVersion = table.Column<int>(type: "int", nullable: false),
                    FechaPublicacionUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false),
                    UsuarioPublicadorId = table.Column<int>(type: "int", nullable: true),
                    EstadoPublicacion = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicacionesListas", x => x.Id);
                    table.CheckConstraint("CK_PublicacionesListas_NumeroVersion", "[NumeroVersion] > 0");
                    table.ForeignKey(
                        name: "FK_PublicacionesListas_ListasReproduccion_ListaReproduccionId",
                        column: x => x.ListaReproduccionId,
                        principalTable: "ListasReproduccion",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GruposPantallas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SucursalId = table.Column<int>(type: "int", nullable: false),
                    GrupoPadreId = table.Column<int>(type: "int", nullable: true),
                    Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EstaActivo = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GruposPantallas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GruposPantallas_GruposPantallas_GrupoPadreId",
                        column: x => x.GrupoPadreId,
                        principalTable: "GruposPantallas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GruposPantallas_Sucursales_SucursalId",
                        column: x => x.SucursalId,
                        principalTable: "Sucursales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ElementosListaReproduccion",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ListaReproduccionId = table.Column<int>(type: "int", nullable: false),
                    AnuncioId = table.Column<int>(type: "int", nullable: false),
                    Posicion = table.Column<int>(type: "int", nullable: false),
                    DuracionPersonalizadaSegundos = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ElementosListaReproduccion", x => x.Id);
                    table.CheckConstraint("CK_ElementosListaReproduccion_DuracionPersonalizadaSegundos", "[DuracionPersonalizadaSegundos] IS NULL OR [DuracionPersonalizadaSegundos] > 0");
                    table.CheckConstraint("CK_ElementosListaReproduccion_Posicion", "[Posicion] > 0");
                    table.ForeignKey(
                        name: "FK_ElementosListaReproduccion_Anuncios_AnuncioId",
                        column: x => x.AnuncioId,
                        principalTable: "Anuncios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ElementosListaReproduccion_ListasReproduccion_ListaReproduccionId",
                        column: x => x.ListaReproduccionId,
                        principalTable: "ListasReproduccion",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ElementosPublicacion",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicacionListaId = table.Column<int>(type: "int", nullable: false),
                    AnuncioId = table.Column<int>(type: "int", nullable: false),
                    ArchivoMultimediaId = table.Column<int>(type: "int", nullable: false),
                    NombreArchivoPublicado = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Posicion = table.Column<int>(type: "int", nullable: false),
                    DuracionSegundos = table.Column<int>(type: "int", nullable: false),
                    HashSha256 = table.Column<string>(type: "nchar(64)", fixedLength: true, maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ElementosPublicacion", x => x.Id);
                    table.CheckConstraint("CK_ElementosPublicacion_DuracionSegundos", "[DuracionSegundos] > 0");
                    table.CheckConstraint("CK_ElementosPublicacion_Posicion", "[Posicion] > 0");
                    table.ForeignKey(
                        name: "FK_ElementosPublicacion_Anuncios_AnuncioId",
                        column: x => x.AnuncioId,
                        principalTable: "Anuncios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ElementosPublicacion_ArchivosMultimedia_ArchivoMultimediaId",
                        column: x => x.ArchivoMultimediaId,
                        principalTable: "ArchivosMultimedia",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ElementosPublicacion_PublicacionesListas_PublicacionListaId",
                        column: x => x.PublicacionListaId,
                        principalTable: "PublicacionesListas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Exportaciones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicacionListaId = table.Column<int>(type: "int", nullable: false),
                    EstadoExportacion = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ClaveAlmacenamiento = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    HashPaquete = table.Column<string>(type: "nchar(64)", fixedLength: true, maxLength: 64, nullable: true),
                    TamanoBytes = table.Column<long>(type: "bigint", nullable: true),
                    FechaSolicitudUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false),
                    FechaFinalizacionUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: true),
                    UsuarioSolicitanteId = table.Column<int>(type: "int", nullable: true),
                    DetalleError = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Exportaciones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Exportaciones_PublicacionesListas_PublicacionListaId",
                        column: x => x.PublicacionListaId,
                        principalTable: "PublicacionesListas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Pantallas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CodigoPantalla = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Modelo = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    NumeroSerie = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    GrupoPantallaId = table.Column<int>(type: "int", nullable: false),
                    ModoReproduccion = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    EstaHabilitada = table.Column<bool>(type: "bit", nullable: false),
                    FechaCreacionUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false),
                    TokenDispositivoHash = table.Column<string>(type: "nchar(64)", fixedLength: true, maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pantallas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Pantallas_GruposPantallas_GrupoPantallaId",
                        column: x => x.GrupoPantallaId,
                        principalTable: "GruposPantallas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AsignacionesListas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ListaReproduccionId = table.Column<int>(type: "int", nullable: false),
                    SucursalId = table.Column<int>(type: "int", nullable: true),
                    GrupoPantallaId = table.Column<int>(type: "int", nullable: true),
                    PantallaId = table.Column<int>(type: "int", nullable: true),
                    EstaHabilitada = table.Column<bool>(type: "bit", nullable: false),
                    FechaInicioUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: true),
                    FechaFinUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: true),
                    FechaCreacionUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AsignacionesListas", x => x.Id);
                    table.CheckConstraint("CK_AsignacionesListas_DestinoUnico", "(CASE WHEN [SucursalId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [GrupoPantallaId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [PantallaId] IS NULL THEN 0 ELSE 1 END) = 1");
                    table.CheckConstraint("CK_AsignacionesListas_Vigencia", "[FechaInicioUtc] IS NULL OR [FechaFinUtc] IS NULL OR [FechaFinUtc] > [FechaInicioUtc]");
                    table.ForeignKey(
                        name: "FK_AsignacionesListas_GruposPantallas_GrupoPantallaId",
                        column: x => x.GrupoPantallaId,
                        principalTable: "GruposPantallas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AsignacionesListas_ListasReproduccion_ListaReproduccionId",
                        column: x => x.ListaReproduccionId,
                        principalTable: "ListasReproduccion",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AsignacionesListas_Pantallas_PantallaId",
                        column: x => x.PantallaId,
                        principalTable: "Pantallas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AsignacionesListas_Sucursales_SucursalId",
                        column: x => x.SucursalId,
                        principalTable: "Sucursales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EstadosPantallas",
                columns: table => new
                {
                    PantallaId = table.Column<int>(type: "int", nullable: false),
                    UltimaConexionUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false),
                    UltimaVersionReportada = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UltimoError = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EstadosPantallas", x => x.PantallaId);
                    table.ForeignKey(
                        name: "FK_EstadosPantallas_Pantallas_PantallaId",
                        column: x => x.PantallaId,
                        principalTable: "Pantallas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReglasHorario",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AsignacionListaId = table.Column<int>(type: "int", nullable: false),
                    DiasSemana = table.Column<int>(type: "int", nullable: false),
                    HoraInicio = table.Column<TimeOnly>(type: "time", nullable: false),
                    HoraFin = table.Column<TimeOnly>(type: "time", nullable: false),
                    ZonaHorariaId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    EstaActiva = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReglasHorario", x => x.Id);
                    table.CheckConstraint("CK_ReglasHorario_Dias", "[DiasSemana] > 0 AND [DiasSemana] <= 127");
                    table.ForeignKey(
                        name: "FK_ReglasHorario_AsignacionesListas_AsignacionListaId",
                        column: x => x.AsignacionListaId,
                        principalTable: "AsignacionesListas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Sucursales",
                columns: new[] { "Id", "Codigo", "EstaActiva", "FechaCreacionUtc", "Nombre", "ZonaHorariaId" },
                values: new object[,]
                {
                    { 1, "MEGACENTRO", true, new DateTime(2026, 10, 12, 0, 0, 0, 0, DateTimeKind.Utc), "Megacentro", "America/Santo_Domingo" },
                    { 2, "SABANA-LARGA", true, new DateTime(2026, 10, 12, 0, 0, 0, 0, DateTimeKind.Utc), "Sabana Larga", "America/Santo_Domingo" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Anuncios_ArchivoMultimediaId",
                table: "Anuncios",
                column: "ArchivoMultimediaId");

            migrationBuilder.CreateIndex(
                name: "IX_ArchivosMultimedia_ClaveAlmacenamiento",
                table: "ArchivosMultimedia",
                column: "ClaveAlmacenamiento",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ArchivosMultimedia_HashSha256",
                table: "ArchivosMultimedia",
                column: "HashSha256");

            migrationBuilder.CreateIndex(
                name: "IX_AsignacionesListas_FechaInicioUtc_FechaFinUtc",
                table: "AsignacionesListas",
                columns: new[] { "FechaInicioUtc", "FechaFinUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_AsignacionesListas_GrupoPantallaId",
                table: "AsignacionesListas",
                column: "GrupoPantallaId");

            migrationBuilder.CreateIndex(
                name: "IX_AsignacionesListas_ListaReproduccionId",
                table: "AsignacionesListas",
                column: "ListaReproduccionId");

            migrationBuilder.CreateIndex(
                name: "IX_AsignacionesListas_PantallaId",
                table: "AsignacionesListas",
                column: "PantallaId");

            migrationBuilder.CreateIndex(
                name: "IX_AsignacionesListas_SucursalId",
                table: "AsignacionesListas",
                column: "SucursalId");

            migrationBuilder.CreateIndex(
                name: "IX_ElementosListaReproduccion_AnuncioId",
                table: "ElementosListaReproduccion",
                column: "AnuncioId");

            migrationBuilder.CreateIndex(
                name: "IX_ElementosListaReproduccion_ListaReproduccionId_Posicion",
                table: "ElementosListaReproduccion",
                columns: new[] { "ListaReproduccionId", "Posicion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ElementosPublicacion_AnuncioId",
                table: "ElementosPublicacion",
                column: "AnuncioId");

            migrationBuilder.CreateIndex(
                name: "IX_ElementosPublicacion_ArchivoMultimediaId",
                table: "ElementosPublicacion",
                column: "ArchivoMultimediaId");

            migrationBuilder.CreateIndex(
                name: "IX_ElementosPublicacion_PublicacionListaId_Posicion",
                table: "ElementosPublicacion",
                columns: new[] { "PublicacionListaId", "Posicion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Exportaciones_PublicacionListaId",
                table: "Exportaciones",
                column: "PublicacionListaId");

            migrationBuilder.CreateIndex(
                name: "IX_GruposPantallas_GrupoPadreId",
                table: "GruposPantallas",
                column: "GrupoPadreId");

            migrationBuilder.CreateIndex(
                name: "IX_GruposPantallas_SucursalId",
                table: "GruposPantallas",
                column: "SucursalId");

            migrationBuilder.CreateIndex(
                name: "IX_Pantallas_CodigoPantalla",
                table: "Pantallas",
                column: "CodigoPantalla",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Pantallas_GrupoPantallaId",
                table: "Pantallas",
                column: "GrupoPantallaId");

            migrationBuilder.CreateIndex(
                name: "IX_Pantallas_TokenDispositivoHash",
                table: "Pantallas",
                column: "TokenDispositivoHash",
                unique: true,
                filter: "[TokenDispositivoHash] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PublicacionesListas_ListaReproduccionId_NumeroVersion",
                table: "PublicacionesListas",
                columns: new[] { "ListaReproduccionId", "NumeroVersion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReglasHorario_AsignacionListaId",
                table: "ReglasHorario",
                column: "AsignacionListaId");

            migrationBuilder.CreateIndex(
                name: "IX_Sucursales_Codigo",
                table: "Sucursales",
                column: "Codigo",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ElementosListaReproduccion");

            migrationBuilder.DropTable(
                name: "ElementosPublicacion");

            migrationBuilder.DropTable(
                name: "EstadosPantallas");

            migrationBuilder.DropTable(
                name: "Exportaciones");

            migrationBuilder.DropTable(
                name: "ReglasHorario");

            migrationBuilder.DropTable(
                name: "Anuncios");

            migrationBuilder.DropTable(
                name: "PublicacionesListas");

            migrationBuilder.DropTable(
                name: "AsignacionesListas");

            migrationBuilder.DropTable(
                name: "ArchivosMultimedia");

            migrationBuilder.DropTable(
                name: "ListasReproduccion");

            migrationBuilder.DropTable(
                name: "Pantallas");

            migrationBuilder.DropTable(
                name: "GruposPantallas");

            migrationBuilder.DropTable(
                name: "Sucursales");
        }
    }
}
